import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec } from '../utils/exec.js';

export class AptProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'apt';
  readonly name = 'APT';
  readonly displayName = 'APT (Debian / Ubuntu)';
  readonly description = 'Advanced Package Tool for Debian, Ubuntu, and derivatives';

  public async detect(): Promise<PackageManagerInfo> {
    const res = await safeExec('apt-get', ['-v']);
    const installed = res.exitCode === 0;
    const match = res.stdout.match(/apt\s+([\d\.]+)/i);
    const version = match ? match[1] : undefined;

    let packageCount = 0;
    if (installed) {
      try {
        const pkgs = await this.list();
        packageCount = pkgs.length;
      } catch (_) {}
    }

    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      installed,
      version,
      executablePath: installed ? '/usr/bin/apt' : undefined,
      packageCount,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async list(): Promise<Package[]> {
    // Run dpkg-query -W -f='${binary:Package}\t${Version}\t${binary:Summary}\n'
    const res = await safeExec('dpkg-query', ['-W', "-f=${binary:Package}\t${Version}\t${binary:Summary}\n"], { timeoutMs: 15000 });
    if (res.exitCode !== 0 || !res.stdout.trim()) return [];

    const packages: Package[] = [];
    const lines = res.stdout.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const version = parts[1].trim();
        const description = parts[2] ? parts[2].trim() : '';

        packages.push({
          id: `apt:${name}`,
          name,
          displayName: name,
          version,
          manager: 'apt',
          type: 'system-pkg',
          location: '/usr/bin',
          description,
          installed: true,
          updateAvailable: false,
          installCommand: `sudo apt install ${name}`,
        });
      }
    }

    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^apt:/, '');
    const res = await safeExec('apt-cache', ['show', rawName]);
    if (res.exitCode === 0 && res.stdout.trim()) {
      const lines = res.stdout.split('\n');
      let version = 'unknown';
      let description = '';
      let homepage = '';

      for (const line of lines) {
        if (line.startsWith('Version:')) version = line.replace('Version:', '').trim();
        if (line.startsWith('Description:')) description = line.replace('Description:', '').trim();
        if (line.startsWith('Homepage:')) homepage = line.replace('Homepage:', '').trim();
      }

      return {
        id: `apt:${rawName}`,
        name: rawName,
        displayName: rawName,
        version,
        manager: 'apt',
        type: 'system-pkg',
        location: '/usr/bin',
        description,
        homepage,
        installed: true,
        updateAvailable: false,
        installCommand: `sudo apt install ${rawName}`,
      };
    }
    return null;
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    return { executable: 'apt', args: ['install', '-y', name], requiresPrivilege: true };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    return { executable: 'apt', args: ['remove', '-y', name], requiresPrivilege: true };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    return { executable: 'apt', args: ['upgrade', '-y', name], requiresPrivilege: true };
  }
}

export const aptProvider = new AptProvider();
