import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec, validatePackageName } from '../utils/exec.js';

export class ChocolateyProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'chocolatey';
  readonly name = 'Chocolatey';
  readonly displayName = 'Chocolatey (Windows)';
  readonly description = 'The package manager for Windows';

  public async detect(): Promise<PackageManagerInfo> {
    const res = await safeExec('choco', ['-v']);
    const installed = res.exitCode === 0;
    const version = installed ? res.stdout.trim() : undefined;

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
      executablePath: installed ? 'choco' : undefined,
      packageCount,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async list(): Promise<Package[]> {
    const res = await safeExec('choco', ['list', '--local-only', '--limit-output'], { timeoutMs: 15000 });
    if (res.exitCode !== 0 || !res.stdout.trim()) return [];

    const packages: Package[] = [];
    const lines = res.stdout.split('\n');

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const version = parts[1].trim();

        packages.push({
          id: `chocolatey:${name}`,
          name,
          displayName: name,
          version,
          manager: 'chocolatey',
          type: 'app-pkg',
          location: 'C:\\ProgramData\\chocolatey\\lib',
          installed: true,
          updateAvailable: false,
          installCommand: `choco install ${name} -y`,
        });
      }
    }

    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^chocolatey:/, '');
    const list = await this.list();
    return list.find((p) => p.id === nameOrId || p.name === rawName) || null;
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    return { executable: 'choco', args: ['install', name, '-y'], requiresPrivilege: true };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    return { executable: 'choco', args: ['uninstall', name, '-y'], requiresPrivilege: true };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    return { executable: 'choco', args: ['upgrade', name, '-y'], requiresPrivilege: true };
  }
}

export const chocolateyProvider = new ChocolateyProvider();
