import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec } from '../utils/exec.js';

export class ScoopProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'scoop';
  readonly name = 'Scoop';
  readonly displayName = 'Scoop (Windows)';
  readonly description = 'A command-line installer for Windows';

  public async detect(): Promise<PackageManagerInfo> {
    const res = await safeExec('scoop', ['--version']);
    const installed = res.exitCode === 0;

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
      version: installed ? 'installed' : undefined,
      executablePath: installed ? 'scoop' : undefined,
      packageCount,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async list(): Promise<Package[]> {
    const res = await safeExec('scoop', ['list'], { timeoutMs: 15000 });
    if (res.exitCode !== 0 || !res.stdout.trim()) return [];

    const packages: Package[] = [];
    const lines = res.stdout.split('\n');
    let startParsing = false;

    for (const line of lines) {
      if (line.includes('---')) {
        startParsing = true;
        continue;
      }
      if (!startParsing || !line.trim()) continue;

      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const name = parts[0];
        const version = parts[1];
        packages.push({
          id: `scoop:${name}`,
          name,
          displayName: name,
          version,
          manager: 'scoop',
          type: 'app-pkg',
          location: '~/scoop/apps',
          installed: true,
          updateAvailable: false,
          installCommand: `scoop install ${name}`,
        });
      }
    }

    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^scoop:/, '');
    const list = await this.list();
    return list.find((p) => p.id === nameOrId || p.name === rawName) || null;
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    return { executable: 'scoop', args: ['install', name], requiresPrivilege: false };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    return { executable: 'scoop', args: ['uninstall', name], requiresPrivilege: false };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    return { executable: 'scoop', args: ['update', name], requiresPrivilege: false };
  }
}

export const scoopProvider = new ScoopProvider();
