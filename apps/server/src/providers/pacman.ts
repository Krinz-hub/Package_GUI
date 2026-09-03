import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec } from '../utils/exec.js';

export class PacmanProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'pacman';
  readonly name = 'Pacman';
  readonly displayName = 'Pacman (Arch Linux)';
  readonly description = 'Package manager for Arch Linux and derivatives';

  public async detect(): Promise<PackageManagerInfo> {
    const res = await safeExec('pacman', ['-V']);
    const installed = res.exitCode === 0;

    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      installed,
      version: installed ? res.stdout.split('\n')[0].trim() : undefined,
      executablePath: installed ? '/usr/bin/pacman' : undefined,
      packageCount: 0,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async list(): Promise<Package[]> {
    const res = await safeExec('pacman', ['-Q'], { timeoutMs: 15000 });
    if (res.exitCode !== 0 || !res.stdout.trim()) return [];

    const packages: Package[] = [];
    const lines = res.stdout.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const version = parts[1];

        packages.push({
          id: `pacman:${name}`,
          name,
          displayName: name,
          version,
          manager: 'pacman',
          type: 'system-pkg',
          location: '/usr/bin',
          installed: true,
          updateAvailable: false,
          installCommand: `sudo pacman -S ${name}`,
        });
      }
    }

    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^pacman:/, '');
    const list = await this.list();
    return list.find((p) => p.id === nameOrId || p.name === rawName) || null;
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    return { executable: 'pacman', args: ['-S', '--noconfirm', name], requiresPrivilege: true };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    return { executable: 'pacman', args: ['-R', '--noconfirm', name], requiresPrivilege: true };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    return { executable: 'pacman', args: ['-Syu', '--noconfirm'], requiresPrivilege: true };
  }
}

export const pacmanProvider = new PacmanProvider();
