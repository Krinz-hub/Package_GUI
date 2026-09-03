import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan } from './base.js';
import { safeExec, validatePackageName } from '../utils/exec.js';

export class CargoProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'cargo';
  readonly name = 'Cargo';
  readonly displayName = 'Cargo (Rust)';
  readonly description = 'Rust package manager and package installer';

  private cargoPath: string | null = null;
  private cachedPackages: Package[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 15000;

  private async resolveCargo(): Promise<string | null> {
    if (this.cargoPath && fs.existsSync(this.cargoPath)) return this.cargoPath;

    const candidates = [
      `${os.homedir()}/.cargo/bin/cargo`,
      '/opt/homebrew/bin/cargo',
      '/usr/local/bin/cargo',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.cargoPath = p;
        return p;
      }
    }

    const res = await safeExec('which', ['cargo']);
    if (res.exitCode === 0 && res.stdout.trim()) {
      this.cargoPath = res.stdout.trim();
      return this.cargoPath;
    }

    return null;
  }

  public async detect(): Promise<PackageManagerInfo> {
    const executable = await this.resolveCargo();
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
      const match = verRes.stdout.match(/cargo\s+([\d\.]+)/i);
      version = match ? match[1] : verRes.stdout.split(' ')[1] || 'installed';
    }

    let packageCount = 0;
    try {
      const pkgs = await this.list();
      packageCount = pkgs.length;
    } catch (_) {}

    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      installed: true,
      version,
      executablePath: executable,
      packageCount,
      updatesCount: 0,
      description: this.description,
    };
  }

  public async list(): Promise<Package[]> {
    const now = Date.now();
    if (this.cachedPackages && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedPackages;
    }

    const executable = await this.resolveCargo();
    if (!executable) return [];

    const res = await safeExec(executable, ['install', '--list'], { timeoutMs: 15000 });
    if (res.exitCode !== 0 || !res.stdout.trim()) {
      this.cachedPackages = [];
      return [];
    }

    const packages: Package[] = [];
    const lines = res.stdout.split('\n');

    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_\-]+)\s+v([\d\.]+)(\s*\((.+)\))?:/);
      if (match) {
        const name = match[1];
        const version = match[2];
        const location = `${os.homedir()}/.cargo/bin/${name}`;

        packages.push({
          id: `cargo:${name}`,
          name,
          displayName: name,
          version,
          manager: 'cargo',
          type: 'cargo-bin',
          location,
          installed: true,
          updateAvailable: false,
          installCommand: `cargo install ${name}`,
        });
      }
    }

    this.cachedPackages = packages;
    this.lastFetchTime = Date.now();
    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^cargo:/, '');
    const list = await this.list();
    return list.find((p) => p.id === nameOrId || p.name === rawName) || null;
  }

  public async planInstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveCargo()) || 'cargo';
    return { executable, args: ['install', name], requiresPrivilege: false };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveCargo()) || 'cargo';
    return { executable, args: ['uninstall', name], requiresPrivilege: false };
  }

  public async planUpdate(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const executable = (await this.resolveCargo()) || 'cargo';
    return { executable, args: ['install', name, '--force'], requiresPrivilege: false };
  }

  public invalidateCache(): void {
    this.cachedPackages = null;
    this.lastFetchTime = 0;
  }
}

export const cargoProvider = new CargoProvider();
