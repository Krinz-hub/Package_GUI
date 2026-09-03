import { ProcessInfo } from '@stuff-manager/shared';
import { safeExec } from '../utils/exec.js';
import { providerRegistry } from '../providers/registry.js';

export class ProcessService {
  public async getDevProcesses(): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];
    const portMap = new Map<number, number[]>(); // pid -> ports[]

    // 1. Get listening ports
    const lsofRes = await safeExec('lsof', ['-iTCP', '-sTCP:LISTEN', '-n', '-P'], { timeoutMs: 5000 });
    if (lsofRes.exitCode === 0 && lsofRes.stdout.trim()) {
      const lines = lsofRes.stdout.split('\n').slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 9) {
          const pid = parseInt(parts[1], 10);
          const namePart = parts[8];
          const portMatch = namePart.match(/:(\d+)$/);
          if (pid && portMatch) {
            const port = parseInt(portMatch[1], 10);
            const currentPorts = portMap.get(pid) || [];
            if (!currentPorts.includes(port)) {
              currentPorts.push(port);
            }
            portMap.set(pid, currentPorts);
          }
        }
      }
    }

    // 2. Get process details with ps
    const psRes = await safeExec('ps', ['-eo', 'pid,user,%cpu,%mem,command'], { timeoutMs: 5000 });
    const allPackages = await providerRegistry.listAll().catch(() => []);

    if (psRes.exitCode === 0 && psRes.stdout.trim()) {
      const lines = psRes.stdout.split('\n').slice(1);

      const devKeywords = [
        'node', 'npm', 'pnpm', 'yarn', 'vite', 'next', 'fastify', 'express',
        'n8n', 'ollama', 'docker', 'python', 'python3', 'uvicorn', 'flask', 'django',
        'postgres', 'redis-server', 'mongod', 'mysqld', 'adb', 'cargo', 'rustc', 'electron'
      ];

      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.trim().match(/^(\d+)\s+([^\s]+)\s+([\d\.]+)\s+([\d\.]+)\s+(.+)$/);
        if (match) {
          const pid = parseInt(match[1], 10);
          const user = match[2];
          const cpu = `${match[3]}%`;
          const memory = `${match[4]}%`;
          const command = match[5];

          const isDevProcess = devKeywords.some((kw) => command.toLowerCase().includes(kw));
          const hasListeningPort = portMap.has(pid);

          if (isDevProcess || hasListeningPort) {
            const name = command.split(' ')[0].split('/').pop() || 'process';
            const ports = portMap.get(pid) || [];

            // Correlate process with installed package
            let packageName: string | undefined;
            let packageManager: any | undefined;
            const cmdLower = command.toLowerCase();

            for (const pkg of allPackages) {
              const pkgNameLower = pkg.name.toLowerCase();
              if (
                (pkg.location && command.includes(pkg.location)) ||
                cmdLower.includes(`/${pkgNameLower} `) ||
                cmdLower.includes(`/${pkgNameLower}`) ||
                cmdLower.endsWith(`/${pkgNameLower}`)
              ) {
                packageName = pkg.displayName || pkg.name;
                packageManager = pkg.manager;
                break;
              }
            }

            processes.push({
              pid,
              name,
              command: command.length > 120 ? command.slice(0, 117) + '...' : command,
              ports,
              cpu,
              memory,
              user,
              status: 'running',
              packageName,
              packageManager,
            });
          }
        }
      }
    }

    return processes.slice(0, 50);
  }

  public async stopProcess(pid: number): Promise<{ success: boolean; message: string }> {
    if (!pid || pid <= 1) return { success: false, message: 'Invalid PID' };
    const res = await safeExec('kill', ['-15', String(pid)]);
    return {
      success: res.exitCode === 0,
      message: res.exitCode === 0 ? `Process ${pid} stopped successfully` : `Failed to stop process ${pid}`,
    };
  }
}

export const processService = new ProcessService();
