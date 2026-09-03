import fs from 'fs';
import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
  DockerInfo,
  DockerContainer,
  DockerImage,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec } from '../utils/exec.js';

export class DockerProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'docker';
  readonly name = 'Docker';
  readonly displayName = 'Docker (Containers & Images)';
  readonly description = 'Docker engine, running containers, and local image registry';

  private dockerPath: string | null = null;

  private async resolveDocker(): Promise<string | null> {
    if (this.dockerPath && fs.existsSync(this.dockerPath)) return this.dockerPath;

    const candidates = [
      '/usr/local/bin/docker',
      '/opt/homebrew/bin/docker',
      '/usr/bin/docker',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.dockerPath = p;
        return p;
      }
    }

    const res = await safeExec('which', ['docker']);
    if (res.exitCode === 0 && res.stdout.trim()) {
      this.dockerPath = res.stdout.trim();
      return this.dockerPath;
    }

    return null;
  }

  public async detect(): Promise<PackageManagerInfo> {
    const executable = await this.resolveDocker();
    if (!executable) {
      return {
        id: this.id,
        name: this.name,
        displayName: this.displayName,
        installed: false,
        packageCount: 0,
        updatesCount: 0,
        description: this.description,
      };
    }

    let version = '';
    const verRes = await safeExec(executable, ['--version']);
    if (verRes.exitCode === 0) {
      const match = verRes.stdout.match(/Docker\s+version\s+([\d\.]+)/i);
      version = match ? match[1] : verRes.stdout.trim();
    }

    const dockerInfo = await this.getDockerInfo();

    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      installed: true,
      version,
      executablePath: executable,
      packageCount: dockerInfo.containers.length,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async getDockerInfo(): Promise<DockerInfo> {
    const executable = await this.resolveDocker();
    if (!executable) {
      return {
        available: false,
        daemonRunning: false,
        containers: [],
        images: [],
      };
    }

    // Check client version
    let clientVersion = '';
    const verRes = await safeExec(executable, ['--version']);
    if (verRes.exitCode === 0) clientVersion = verRes.stdout.trim();

    // Check if daemon is running via docker info
    const infoRes = await safeExec(executable, ['info'], { timeoutMs: 5000 });
    const daemonRunning = infoRes.exitCode === 0;

    if (!daemonRunning) {
      return {
        available: true,
        daemonRunning: false,
        clientVersion,
        containers: [],
        images: [],
      };
    }

    const containers: DockerContainer[] = [];
    const images: DockerImage[] = [];

    // Fetch containers
    const psRes = await safeExec(executable, ['ps', '-a', '--format', '{{json .}}'], { timeoutMs: 10000 });
    if (psRes.exitCode === 0 && psRes.stdout.trim()) {
      const lines = psRes.stdout.trim().split('\n');
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          containers.push({
            id: item.ID || '',
            name: item.Names || '',
            image: item.Image || '',
            status: item.Status || '',
            state: item.State || '',
            ports: item.Ports || '',
            created: item.CreatedAt || '',
          });
        } catch (_) {}
      }
    }

    // Fetch images
    const imgRes = await safeExec(executable, ['images', '--format', '{{json .}}'], { timeoutMs: 10000 });
    if (imgRes.exitCode === 0 && imgRes.stdout.trim()) {
      const lines = imgRes.stdout.trim().split('\n');
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          images.push({
            id: item.ID || '',
            repository: item.Repository || '',
            tag: item.Tag || '',
            size: item.Size || '',
            createdSince: item.CreatedSince || '',
          });
        } catch (_) {}
      }
    }

    return {
      available: true,
      daemonRunning: true,
      clientVersion,
      containers,
      images,
    };
  }

  public async list(): Promise<Package[]> {
    const info = await this.getDockerInfo();
    return info.containers.map((c) => ({
      id: `docker:${c.id}`,
      name: c.name,
      displayName: `${c.name} (${c.image})`,
      version: c.state,
      manager: 'docker',
      type: 'container',
      location: `Container ID: ${c.id}`,
      description: `Image: ${c.image} | Status: ${c.status} | Ports: ${c.ports || 'none'}`,
      installed: true,
      updateAvailable: false,
      installCommand: `docker run ${c.image}`,
    }));
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const list = await this.list();
    return list.find((p) => p.id === nameOrId || p.name === nameOrId) || null;
  }

  public async planInstall(image: string): Promise<CommandPlan> {
    const executable = (await this.resolveDocker()) || 'docker';
    return { executable, args: ['pull', image], requiresPrivilege: false };
  }

  public async planUninstall(containerId: string): Promise<CommandPlan> {
    const executable = (await this.resolveDocker()) || 'docker';
    return { executable, args: ['rm', '-f', containerId], requiresPrivilege: false };
  }

  public async planUpdate(image: string): Promise<CommandPlan> {
    const executable = (await this.resolveDocker()) || 'docker';
    return { executable, args: ['pull', image], requiresPrivilege: false };
  }
}

export const dockerProvider = new DockerProvider();
