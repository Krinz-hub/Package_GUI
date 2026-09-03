import { PortInfo } from '@stuff-manager/shared';
import { platform } from './platform.js';
import { safeExec } from '../utils/exec.js';
import { providerRegistry } from '../providers/registry.js';

export class PortScanner {
  public async scanListeningPorts(): Promise<PortInfo[]> {
    const rawPorts = await platform.scanPorts();
    if (rawPorts.length === 0) return [];

    // Get detailed process information for PIDs
    const pidMap = new Map<number, { name: string; command: string; user?: string }>();

    try {
      const psRes = await safeExec('ps', ['-eo', 'pid,user,command'], { timeoutMs: 3000 });
      if (psRes.exitCode === 0 && psRes.stdout.trim()) {
        const lines = psRes.stdout.split('\n').slice(1);
        for (const line of lines) {
          if (!line.trim()) continue;
          const match = line.trim().match(/^(\d+)\s+([^\s]+)\s+(.+)$/);
          if (match) {
            const pid = parseInt(match[1], 10);
            const user = match[2];
            const command = match[3];
            const name = command.split(' ')[0].split('/').pop() || 'process';
            pidMap.set(pid, { name, command, user });
          }
        }
      }
    } catch (_) {}

    // Get all installed packages to cross-reference
    const allPackages = await providerRegistry.listAll().catch(() => []);

    const enrichedPorts: PortInfo[] = rawPorts.map((p) => {
      const proc = pidMap.get(p.pid);
      const command = proc ? proc.command : p.command;
      const processName = proc ? proc.name : p.processName;
      const user = proc?.user || p.user;

      // Attempt to resolve Port -> PID -> Process -> Package
      let packageName: string | undefined;
      let packageManager: any | undefined;
      let packageId: string | undefined;

      if (command) {
        const cmdLower = command.toLowerCase();
        for (const pkg of allPackages) {
          const pkgNameLower = pkg.name.toLowerCase();
          // Check if command explicitly references package name or package location
          if (
            (pkg.location && command.includes(pkg.location)) ||
            cmdLower.includes(`/${pkgNameLower} `) ||
            cmdLower.includes(`/${pkgNameLower}`) ||
            cmdLower.endsWith(`/${pkgNameLower}`) ||
            cmdLower.includes(`bin/${pkgNameLower}`)
          ) {
            packageName = pkg.displayName || pkg.name;
            packageManager = pkg.manager;
            packageId = pkg.id;
            break;
          }
        }
      }

      return {
        ...p,
        processName,
        command,
        user,
        packageName,
        packageManager,
        packageId,
      };
    });

    // Sort by port ascending
    return enrichedPorts.sort((a, b) => a.port - b.port);
  }
}

export const portScanner = new PortScanner();
