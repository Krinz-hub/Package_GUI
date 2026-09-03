import fs from 'fs';
import path from 'path';
import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec, validatePackageName } from '../utils/exec.js';

export class HomebrewProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'brew';
  readonly name = 'Homebrew';
  readonly displayName = 'Homebrew (macOS)';
  readonly description = 'The missing package manager for macOS (Formulae & Casks)';

  private brewPath: string | null = null;
  private cachedPackages: Package[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 15000; // 15s cache

  private async resolveBrew(): Promise<string | null> {
    if (this.brewPath && fs.existsSync(this.brewPath)) return this.brewPath;

    const candidates = [
      '/opt/homebrew/bin/brew',
      '/usr/local/bin/brew',
      '/home/linuxbrew/.linuxbrew/bin/brew',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.brewPath = p;
        return p;
      }
    }

    const res = await safeExec('which', ['brew']);
    if (res.exitCode === 0 && res.stdout.trim()) {
      this.brewPath = res.stdout.trim();
      return this.brewPath;
    }

    return null;
  }

  public async detect(): Promise<PackageManagerInfo> {
    const executable = await this.resolveBrew();
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
      const match = verRes.stdout.match(/Homebrew\s+([\d\.]+)/i);
      version = match ? match[1] : verRes.stdout.split('\n')[0].trim();
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

    const executable = await this.resolveBrew();
    if (!executable) return [];

    // Run brew info --json=v2 --installed and brew outdated in parallel
    const [infoRes, outdatedRes] = await Promise.all([
      safeExec(executable, ['info', '--json=v2', '--installed'], { timeoutMs: 30000 }),
      safeExec(executable, ['outdated', '--json=v2'], { timeoutMs: 30000 }),
    ]);

    const outdatedMap = new Map<string, string>(); // name -> current_version
    if (outdatedRes.exitCode === 0 && outdatedRes.stdout.trim()) {
      try {
        const outdatedJson = JSON.parse(outdatedRes.stdout.trim());
        if (Array.isArray(outdatedJson.formulae)) {
          for (const item of outdatedJson.formulae) {
            outdatedMap.set(item.name, item.current_version);
          }
        }
        if (Array.isArray(outdatedJson.casks)) {
          for (const item of outdatedJson.casks) {
            outdatedMap.set(item.name, item.current_version);
          }
        }
      } catch (e) {
        // non-blocking
      }
    }

    const packages: Package[] = [];

    if (infoRes.exitCode === 0 && infoRes.stdout.trim()) {
      try {
        const data = JSON.parse(infoRes.stdout.trim());

        // Parse formulae
        if (Array.isArray(data.formulae)) {
          for (const f of data.formulae) {
            const installedItem = f.installed?.[0] || {};
            const version = installedItem.version || f.versions?.stable || 'unknown';
            const latest = outdatedMap.get(f.name) || f.versions?.stable || version;
            const updateAvailable = outdatedMap.has(f.name) || (latest !== version && latest !== 'unknown');
            const cellarPrefix = executable.startsWith('/opt/homebrew') ? '/opt/homebrew/Cellar' : '/usr/local/Cellar';
            const location = path.join(cellarPrefix, f.name, version);

            packages.push({
              id: `brew:${f.name}`,
              name: f.name,
              displayName: f.full_name || f.name,
              version,
              latestVersion: updateAvailable ? latest : undefined,
              manager: 'brew',
              type: 'formula',
              location,
              description: f.desc || '',
              homepage: f.homepage || '',
              license: f.license || '',
              installed: true,
              updateAvailable,
              dependencies: f.dependencies || [],
              caveats: f.caveats || undefined,
              installCommand: `brew install ${f.name}`,
              pinned: Boolean(f.pinned),
              bottle: Boolean(f.bottle),
              tap: f.tap || 'homebrew/core',
            });
          }
        }

        // Parse casks
        if (Array.isArray(data.casks)) {
          for (const c of data.casks) {
            const version = c.installed || c.version || 'unknown';
            const latest = outdatedMap.get(c.token || c.name?.[0]) || c.version || version;
            const updateAvailable = outdatedMap.has(c.token || c.name?.[0]);
            const location = `/Applications/${c.name?.[0] || c.token}.app`;

            packages.push({
              id: `brew:cask:${c.token || c.name?.[0]}`,
              name: c.token || c.name?.[0] || 'unknown',
              displayName: c.name?.[0] || c.token || 'unknown',
              version,
              latestVersion: updateAvailable ? latest : undefined,
              manager: 'brew',
              type: 'cask',
              location,
              description: c.desc || '',
              homepage: c.homepage || '',
              installed: true,
              updateAvailable,
              caveats: c.caveats || undefined,
              installCommand: `brew install --cask ${c.token || c.name?.[0]}`,
              tap: c.tap || 'homebrew/cask',
            });
          }
        }
      } catch (e) {
        console.error('Error parsing brew info json:', e);
      }
    }

    this.cachedPackages = packages;
    this.lastFetchTime = Date.now();
    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^brew:(cask:)?/, '');
    if (!validatePackageName(rawName)) return null;

    const list = await this.list();
    const existing = list.find((p) => p.id === nameOrId || p.name === rawName);
    if (existing) return existing;

    const executable = await this.resolveBrew();
    if (!executable) return null;

    const res = await safeExec(executable, ['info', '--json=v2', rawName]);
    if (res.exitCode === 0 && res.stdout.trim()) {
      try {
        const data = JSON.parse(res.stdout.trim());
        if (data.formulae?.[0]) {
          const f = data.formulae[0];
          return {
            id: `brew:${f.name}`,
            name: f.name,
            displayName: f.full_name || f.name,
            version: f.versions?.stable || 'unknown',
            manager: 'brew',
            type: 'formula',
            location: `/opt/homebrew/Cellar/${f.name}`,
            description: f.desc || '',
            homepage: f.homepage || '',
            license: f.license || '',
            installed: Boolean(f.installed?.length),
            updateAvailable: false,
            dependencies: f.dependencies || [],
            caveats: f.caveats || undefined,
            installCommand: `brew install ${f.name}`,
          };
        }
        if (data.casks?.[0]) {
          const c = data.casks[0];
          return {
            id: `brew:cask:${c.token}`,
            name: c.token,
            displayName: c.name?.[0] || c.token,
            version: c.version || 'unknown',
            manager: 'brew',
            type: 'cask',
            location: `/Applications/${c.token}.app`,
            description: c.desc || '',
            homepage: c.homepage || '',
            installed: Boolean(c.installed),
            updateAvailable: false,
            installCommand: `brew install --cask ${c.token}`,
          };
        }
      } catch (_) {}
    }

    return null;
  }

  public async search(query: string): Promise<Package[]> {
    if (!validatePackageName(query)) return [];
    const executable = await this.resolveBrew();
    if (!executable) return [];

    const res = await safeExec(executable, ['search', query], { timeoutMs: 15000 });
    if (res.exitCode !== 0) return [];

    const lines = res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    const results: Package[] = [];
    let isCaskSection = false;

    for (const line of lines) {
      if (line.includes('==> Formulae')) {
        isCaskSection = false;
        continue;
      }
      if (line.includes('==> Casks')) {
        isCaskSection = true;
        continue;
      }
      if (line.startsWith('==>')) continue;

      const items = line.split(/\s+/).filter(Boolean);
      for (const item of items) {
        if (!validatePackageName(item)) continue;
        results.push({
          id: isCaskSection ? `brew:cask:${item}` : `brew:${item}`,
          name: item,
          displayName: item,
          version: 'latest',
          manager: 'brew',
          type: isCaskSection ? 'cask' : 'formula',
          location: '',
          installed: false,
          updateAvailable: false,
          installCommand: isCaskSection ? `brew install --cask ${item}` : `brew install ${item}`,
        });
      }
    }

    return results.slice(0, 30);
  }

  public async planInstall(name: string, options?: { isCask?: boolean }): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveBrew()) || 'brew';
    const args = ['install'];
    if (options?.isCask) args.push('--cask');
    args.push(name);
    return { executable, args, requiresPrivilege: false };
  }

  public async planUninstall(name: string, options?: { isCask?: boolean }): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveBrew()) || 'brew';
    const args = ['uninstall'];
    if (options?.isCask) args.push('--cask');
    args.push(name);
    return { executable, args, requiresPrivilege: false };
  }

  public async planUpdate(name: string, options?: { isCask?: boolean }): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveBrew()) || 'brew';
    const args = ['upgrade', name];
    return { executable, args, requiresPrivilege: false };
  }

  public async planReinstall(name: string, options?: { isCask?: boolean }): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveBrew()) || 'brew';
    const args = ['reinstall', name];
    return { executable, args, requiresPrivilege: false };
  }

  public invalidateCache(): void {
    this.cachedPackages = null;
    this.lastFetchTime = 0;
  }
}

export const brewProvider = new HomebrewProvider();
