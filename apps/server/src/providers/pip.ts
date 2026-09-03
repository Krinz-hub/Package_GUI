import fs from 'fs';
import path from 'path';
import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec, validatePackageName } from '../utils/exec.js';

export class PipProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'pip';
  readonly name = 'pip';
  readonly displayName = 'Python (pip3)';
  readonly description = 'The package installer for Python libraries and CLI tools';

  private pipPath: string | null = null;
  private cachedPackages: Package[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 15000;

  private async resolvePip(): Promise<string | null> {
    if (this.pipPath && fs.existsSync(this.pipPath)) return this.pipPath;

    const candidates = [
      '/opt/homebrew/bin/pip3',
      '/usr/local/bin/pip3',
      '/usr/bin/pip3',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.pipPath = p;
        return p;
      }
    }

    const res = await safeExec('which', ['pip3']);
    if (res.exitCode === 0 && res.stdout.trim()) {
      this.pipPath = res.stdout.trim();
      return this.pipPath;
    }

    return null;
  }

  public async detect(): Promise<PackageManagerInfo> {
    const executable = await this.resolvePip();
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
      const match = verRes.stdout.match(/pip\s+([\d\.]+)/i);
      version = match ? match[1] : verRes.stdout.split(' ')[1] || 'installed';
    }

    let packageCount = 0;
    let updatesCount = 0;
    try {
      const pkgs = await this.list();
      packageCount = pkgs.length;
      updatesCount = pkgs.filter((p) => p.updateAvailable).length;
    } catch (_) {}

    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      installed: true,
      version,
      executablePath: executable,
      packageCount,
      updatesCount,
      description: this.description,
    };
  }

  public async list(): Promise<Package[]> {
    const now = Date.now();
    if (this.cachedPackages && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedPackages;
    }

    const executable = await this.resolvePip();
    if (!executable) return [];

    const [listRes, outdatedRes] = await Promise.all([
      safeExec(executable, ['list', '--format=json'], { timeoutMs: 15000 }),
      safeExec(executable, ['list', '--outdated', '--format=json'], { timeoutMs: 15000 }),
    ]);

    const outdatedMap = new Map<string, string>(); // name -> latest_version
    if (outdatedRes.stdout.trim()) {
      try {
        const outJson = JSON.parse(outdatedRes.stdout.trim());
        if (Array.isArray(outJson)) {
          for (const item of outJson) {
            if (item.name && item.latest_version) {
              outdatedMap.set(item.name.toLowerCase(), item.latest_version);
            }
          }
        }
      } catch (_) {}
    }

    const packages: Package[] = [];

    if (listRes.stdout.trim()) {
      try {
        const listJson = JSON.parse(listRes.stdout.trim());
        if (Array.isArray(listJson)) {
          for (const item of listJson) {
            const name = item.name;
            const version = item.version || 'unknown';
            const latest = outdatedMap.get(name.toLowerCase());
            const updateAvailable = Boolean(latest && latest !== version);

            packages.push({
              id: `pip:${name}`,
              name,
              displayName: name,
              version,
              latestVersion: updateAvailable ? latest : undefined,
              manager: 'pip',
              type: 'pip-pkg',
              location: 'python site-packages',
              installed: true,
              updateAvailable,
              installCommand: `pip3 install ${name}`,
            });
          }
        }
      } catch (e) {
        console.error('Error parsing pip list json:', e);
      }
    }

    this.cachedPackages = packages;
    this.lastFetchTime = Date.now();
    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^pip:/, '');
    if (!validatePackageName(rawName)) return null;

    const list = await this.list();
    const existing = list.find((p) => p.id === nameOrId || p.name.toLowerCase() === rawName.toLowerCase());

    const executable = await this.resolvePip();
    if (!executable) return existing || null;

    const res = await safeExec(executable, ['show', rawName], { timeoutMs: 10000 });
    if (res.exitCode === 0 && res.stdout.trim()) {
      const lines = res.stdout.split('\n');
      const details: Record<string, string> = {};
      for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          details[key] = val;
        }
      }

      return {
        id: `pip:${rawName}`,
        name: details['Name'] || rawName,
        displayName: details['Name'] || rawName,
        version: details['Version'] || (existing ? existing.version : 'unknown'),
        manager: 'pip',
        type: 'pip-pkg',
        location: details['Location'] || (existing ? existing.location : ''),
        description: details['Summary'] || '',
        homepage: details['Home-page'] || '',
        license: details['License'] || '',
        installed: true,
        updateAvailable: existing ? existing.updateAvailable : false,
        dependencies: details['Requires'] ? details['Requires'].split(',').map((s) => s.trim()).filter(Boolean) : [],
        installCommand: `pip3 install ${rawName}`,
      };
    }

    return existing || null;
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolvePip()) || 'pip3';
    return { executable, args: ['install', name], requiresPrivilege: false };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolvePip()) || 'pip3';
    return { executable, args: ['uninstall', '-y', name], requiresPrivilege: false };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolvePip()) || 'pip3';
    return { executable, args: ['install', '--upgrade', name], requiresPrivilege: false };
  }

  public async planReinstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolvePip()) || 'pip3';
    return { executable, args: ['install', '--force-reinstall', name], requiresPrivilege: false };
  }

  public invalidateCache(): void {
    this.cachedPackages = null;
    this.lastFetchTime = 0;
  }
}

export const pipProvider = new PipProvider();
