import fs from 'fs';
import path from 'path';
import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec, validatePackageName } from '../utils/exec.js';

export class NpmProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'npm';
  readonly name = 'npm';
  readonly displayName = 'npm (Node.js Global Packages)';
  readonly description = 'Node.js Package Manager for globally installed tools and CLI utilities';

  private npmPath: string | null = null;
  private globalRoot: string | null = null;
  private cachedPackages: Package[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 15000;

  private async resolveNpm(): Promise<string | null> {
    if (this.npmPath && fs.existsSync(this.npmPath)) return this.npmPath;

    const candidates = [
      '/opt/homebrew/bin/npm',
      '/usr/local/bin/npm',
      '/usr/bin/npm',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.npmPath = p;
        return p;
      }
    }

    const res = await safeExec('which', ['npm']);
    if (res.exitCode === 0 && res.stdout.trim()) {
      this.npmPath = res.stdout.trim();
      return this.npmPath;
    }

    return null;
  }

  private async getGlobalRoot(): Promise<string> {
    if (this.globalRoot) return this.globalRoot;
    const executable = await this.resolveNpm();
    if (!executable) return '/usr/local/lib/node_modules';

    const res = await safeExec(executable, ['root', '-g']);
    if (res.exitCode === 0 && res.stdout.trim()) {
      this.globalRoot = res.stdout.trim();
      return this.globalRoot;
    }
    return '/opt/homebrew/lib/node_modules';
  }

  public async detect(): Promise<PackageManagerInfo> {
    const executable = await this.resolveNpm();
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
    const verRes = await safeExec(executable, ['-v']);
    if (verRes.exitCode === 0) {
      version = verRes.stdout.trim();
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

    const executable = await this.resolveNpm();
    if (!executable) return [];

    const rootDir = await this.getGlobalRoot();

    const [listRes, outdatedRes] = await Promise.all([
      safeExec(executable, ['list', '-g', '--depth=0', '--json'], { timeoutMs: 15000 }),
      safeExec(executable, ['outdated', '-g', '--json'], { timeoutMs: 15000 }),
    ]);

    const outdatedMap = new Map<string, string>(); // name -> latest
    if (outdatedRes.stdout.trim()) {
      try {
        const outJson = JSON.parse(outdatedRes.stdout.trim());
        for (const [pkgName, details] of Object.entries<any>(outJson)) {
          if (details?.latest) {
            outdatedMap.set(pkgName, details.latest);
          }
        }
      } catch (_) {}
    }

    const packages: Package[] = [];

    if (listRes.stdout.trim()) {
      try {
        const listJson = JSON.parse(listRes.stdout.trim());
        const deps = listJson.dependencies || {};

        for (const [name, info] of Object.entries<any>(deps)) {
          const version = info.version || 'unknown';
          const latest = outdatedMap.get(name);
          const updateAvailable = Boolean(latest && latest !== version);
          const location = path.join(rootDir, name);

          packages.push({
            id: `npm:${name}`,
            name,
            displayName: name,
            version,
            latestVersion: updateAvailable ? latest : undefined,
            manager: 'npm',
            type: 'global-pkg',
            location,
            installed: true,
            updateAvailable,
            installCommand: `npm install -g ${name}`,
          });
        }
      } catch (e) {
        console.error('Error parsing npm list json:', e);
      }
    }

    this.cachedPackages = packages;
    this.lastFetchTime = Date.now();
    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^npm:/, '');
    if (!validatePackageName(rawName)) return null;

    const list = await this.list();
    const existing = list.find((p) => p.id === nameOrId || p.name === rawName);

    const executable = await this.resolveNpm();
    if (!executable) return existing || null;

    const res = await safeExec(executable, ['view', rawName, '--json'], { timeoutMs: 10000 });
    if (res.exitCode === 0 && res.stdout.trim()) {
      try {
        const meta = JSON.parse(res.stdout.trim());
        const rootDir = await this.getGlobalRoot();
        return {
          id: `npm:${rawName}`,
          name: rawName,
          displayName: meta.name || rawName,
          version: existing ? existing.version : meta.version || 'unknown',
          latestVersion: meta.version,
          manager: 'npm',
          type: 'global-pkg',
          location: path.join(rootDir, rawName),
          description: meta.description || '',
          homepage: meta.homepage || '',
          license: meta.license || '',
          installed: Boolean(existing),
          updateAvailable: existing ? Boolean(meta.version && meta.version !== existing.version) : false,
          dependencies: meta.dependencies ? Object.keys(meta.dependencies) : [],
          installCommand: `npm install -g ${rawName}`,
        };
      } catch (_) {}
    }

    return existing || null;
  }

  public async search(query: string): Promise<Package[]> {
    if (!validatePackageName(query)) return [];
    const executable = await this.resolveNpm();
    if (!executable) return [];

    const res = await safeExec(executable, ['search', query, '--json', '--limit=20'], { timeoutMs: 15000 });
    if (res.exitCode !== 0 || !res.stdout.trim()) return [];

    try {
      const list = JSON.parse(res.stdout.trim());
      if (Array.isArray(list)) {
        return list.map((item: any) => ({
          id: `npm:${item.name}`,
          name: item.name,
          displayName: item.name,
          version: item.version || 'latest',
          manager: 'npm',
          type: 'global-pkg',
          location: '',
          description: item.description || '',
          homepage: item.links?.homepage || '',
          installed: false,
          updateAvailable: false,
          installCommand: `npm install -g ${item.name}`,
        }));
      }
    } catch (_) {}

    return [];
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveNpm()) || 'npm';
    return { executable, args: ['install', '-g', name], requiresPrivilege: false };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveNpm()) || 'npm';
    return { executable, args: ['uninstall', '-g', name], requiresPrivilege: false };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveNpm()) || 'npm';
    return { executable, args: ['update', '-g', name], requiresPrivilege: false };
  }

  public async planReinstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveNpm()) || 'npm';
    return { executable, args: ['install', '-g', name, '--force'], requiresPrivilege: false };
  }

  public invalidateCache(): void {
    this.cachedPackages = null;
    this.lastFetchTime = 0;
  }
}

export const npmProvider = new NpmProvider();
