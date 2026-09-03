import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec } from '../utils/exec.js';

export class DnfProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'dnf';
  readonly name = 'DNF';
  readonly displayName = 'DNF (Fedora / RHEL)';
  readonly description = 'Next-generation package manager for RPM-based Linux distributions';

  public async detect(): Promise<PackageManagerInfo> {
    const res = await safeExec('dnf', ['--version']);
    const installed = res.exitCode === 0;

    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      installed,
      version: installed ? res.stdout.split('\n')[0].trim() : undefined,
      executablePath: installed ? '/usr/bin/dnf' : undefined,
      packageCount: 0,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async list(): Promise<Package[]> {
    const res = await safeExec('rpm', ['-qa', '--qf', '%{NAME}\t%{VERSION}-%{RELEASE}\t%{SUMMARY}\n'], { timeoutMs: 15000 });
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
          id: `dnf:${name}`,
          name,
          displayName: name,
          version,
          manager: 'dnf',
          type: 'system-pkg',
          location: '/usr/bin',
          description,
          installed: true,
          updateAvailable: false,
          installCommand: `sudo dnf install ${name}`,
        });
      }
    }

    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^dnf:/, '');
    const list = await this.list();
    return list.find((p) => p.id === nameOrId || p.name === rawName) || null;
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    return { executable: 'dnf', args: ['install', '-y', name], requiresPrivilege: true };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    return { executable: 'dnf', args: ['remove', '-y', name], requiresPrivilege: true };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    return { executable: 'dnf', args: ['upgrade', '-y', name], requiresPrivilege: true };
  }
}

export const dnfProvider = new DnfProvider();
