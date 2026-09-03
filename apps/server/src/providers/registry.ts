import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
  SystemOverview,
} from '@stuff-manager/shared';
import os from 'os';
import { PackageManagerProvider } from './base.js';
import { brewProvider } from './brew.js';
import { npmProvider } from './npm.js';
import { pipProvider } from './pip.js';
import { cargoProvider } from './cargo.js';
import { dockerProvider } from './docker.js';
import { androidProvider } from './android.js';

export class ProviderRegistry {
  private providers = new Map<PackageManagerType, PackageManagerProvider>();

  constructor() {
    this.register(brewProvider);
    this.register(npmProvider);
    this.register(pipProvider);
    this.register(cargoProvider);
    this.register(dockerProvider);
    this.register(androidProvider);
  }

  public register(provider: PackageManagerProvider): void {
    this.providers.set(provider.id, provider);
  }

  public get(id: PackageManagerType): PackageManagerProvider | undefined {
    return this.providers.get(id);
  }

  public getAll(): PackageManagerProvider[] {
    return Array.from(this.providers.values());
  }

  public async detectAll(): Promise<PackageManagerInfo[]> {
    const promises = this.getAll().map((p) =>
      p.detect().catch(() => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        installed: false,
        packageCount: 0,
        updatesCount: 0,
        description: p.description,
      }))
    );
    return Promise.all(promises);
  }

  public async listAll(manager?: PackageManagerType): Promise<Package[]> {
    if (manager) {
      const provider = this.get(manager);
      if (!provider) return [];
      return provider.list().catch(() => []);
    }

    const promises = this.getAll().map((p) => p.list().catch(() => []));
    const results = await Promise.all(promises);
    return results.flat();
  }

  public async findPackage(id: string): Promise<Package | null> {
    const parts = id.split(':');
    const managerId = parts[0] as PackageManagerType;
    const provider = this.get(managerId);
    if (provider) {
      return provider.info(id);
    }
    // Search all providers
    for (const p of this.getAll()) {
      const pkg = await p.info(id).catch(() => null);
      if (pkg) return pkg;
    }
    return null;
  }

  public async searchAll(query: string, manager?: PackageManagerType): Promise<Package[]> {
    if (manager) {
      const provider = this.get(manager);
      if (!provider || !provider.search) return [];
      return provider.search(query).catch(() => []);
    }

    const providersWithSearch = this.getAll().filter((p) => typeof p.search === 'function');
    const promises = providersWithSearch.map((p) => p.search!(query).catch(() => []));
    const results = await Promise.all(promises);
    return results.flat();
  }

  public async getOverview(): Promise<SystemOverview> {
    const [managers, allPackages] = await Promise.all([
      this.detectAll(),
      this.listAll(),
    ]);

    const totalUpdates = allPackages.filter((p) => p.updateAvailable).length;

    return {
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
      },
      totalPackages: allPackages.length,
      totalUpdates,
      managers,
      doctorIssuesCount: 0,
      runningProcessesCount: 0,
    };
  }

  public invalidateAllCaches(): void {
    for (const provider of this.getAll()) {
      if ('invalidateCache' in provider && typeof (provider as any).invalidateCache === 'function') {
        (provider as any).invalidateCache();
      }
    }
  }
}

export const providerRegistry = new ProviderRegistry();
