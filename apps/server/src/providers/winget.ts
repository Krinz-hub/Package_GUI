import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec, validatePackageName } from '../utils/exec.js';

export class WingetProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'winget';
  readonly name = 'winget';
  readonly displayName = 'Windows Package Manager (winget)';
  readonly description = 'Official command-line tool for discovering and installing Windows applications';

  public async detect(): Promise<PackageManagerInfo> {
    const res = await safeExec('winget', ['--version']);
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
      executablePath: installed ? 'winget' : undefined,
      packageCount,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async list(): Promise<Package[]> {
    const res = await safeExec('winget', ['list', '--accept-source-agreements'], { timeoutMs: 20000 });
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

      const parts = line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const name = parts[0];
        const id = parts[1] || name;
        const version = parts[2] || 'installed';

        packages.push({
          id: `winget:${id}`,
          name: id,
          displayName: name,
          version,
          manager: 'winget',
          type: 'app-pkg',
          location: 'C:\\Program Files',
          installed: true,
          updateAvailable: false,
          installCommand: `winget install ${id}`,
        });
      }
    }

    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawId = nameOrId.replace(/^winget:/, '');
    const list = await this.list();
    return list.find((p) => p.id === nameOrId || p.name === rawId) || null;
  }

  public async search(query: string): Promise<Package[]> {
    if (!validatePackageName(query)) return [];
    const res = await safeExec('winget', ['search', query], { timeoutMs: 15000 });
    if (res.exitCode !== 0) return [];

    const packages: Package[] = [];
    const lines = res.stdout.split('\n');
    let startParsing = false;

    for (const line of lines) {
      if (line.includes('---')) {
        startParsing = true;
        continue;
      }
      if (!startParsing || !line.trim()) continue;

      const parts = line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const name = parts[0];
        const id = parts[1] || name;
        packages.push({
          id: `winget:${id}`,
          name: id,
          displayName: name,
          version: parts[2] || 'latest',
          manager: 'winget',
          type: 'app-pkg',
          location: '',
          installed: false,
          updateAvailable: false,
          installCommand: `winget install ${id}`,
        });
      }
    }

    return packages.slice(0, 30);
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    return { executable: 'winget', args: ['install', '--id', name, '-e'], requiresPrivilege: true };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    return { executable: 'winget', args: ['uninstall', '--id', name, '-e'], requiresPrivilege: true };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    return { executable: 'winget', args: ['upgrade', '--id', name, '-e'], requiresPrivilege: true };
  }
}

export const wingetProvider = new WingetProvider();
