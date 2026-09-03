import { ProcessInfo } from '@stuff-manager/shared';
import { safeExec } from '../utils/exec.js';
import { providerRegistry } from '../providers/registry.js';
import process from 'process';

export interface ProcessStopResult {
  success: boolean;
  pid: number;
  status: 'stopped' | 'running';
  message: string;
  code?: string;
}

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

  /**
   * Checks if a process is alive.
   */
  public isProcessAlive(pid: number): boolean {
    if (typeof pid !== 'number' || isNaN(pid) || pid <= 0) return false;
    try {
      // Signal 0 tests for existence without sending an actual termination signal
      process.kill(pid, 0);
      return true;
    } catch (err: any) {
      // EPERM means process exists but we lack permission to signal it
      if (err && err.code === 'EPERM') return true;
      return false;
    }
  }

  /**
   * Stops a process by PID using cross-platform graceful-first termination with verification.
   */
  public async stopProcess(pid: number): Promise<ProcessStopResult> {
    // 1. Validation
    if (typeof pid !== 'number' || isNaN(pid) || !Number.isInteger(pid) || pid <= 0) {
      return {
        success: false,
        pid,
        status: 'running',
        code: 'INVALID_PID',
        message: `Invalid PID: ${pid}. PID must be a positive integer.`,
      };
    }

    // 2. Safeguard against terminating system-critical processes
    if (pid === 1) {
      return {
        success: false,
        pid,
        status: 'running',
        code: 'CRITICAL_SYSTEM_PROCESS',
        message: 'Cannot terminate system initialization process (PID 1).',
      };
    }

    // 3. Safeguard against PACKAGE GUI terminating itself
    if (pid === process.pid || pid === process.ppid) {
      return {
        success: false,
        pid,
        status: 'running',
        code: 'SELF_TERMINATION_PROTECTED',
        message: 'Cannot terminate the active PACKAGE GUI server process.',
      };
    }

    // 4. Pre-check: Verify process is running
    if (!this.isProcessAlive(pid)) {
      return {
        success: true,
        pid,
        status: 'stopped',
        message: `Process ${pid} is already stopped or does not exist.`,
      };
    }

    const isWindows = process.platform === 'win32';

    // 5. Stage 1: Graceful Termination (SIGTERM on Unix / taskkill on Windows)
    try {
      if (isWindows) {
        await safeExec('taskkill', ['/PID', String(pid)]);
      } else {
        process.kill(pid, 'SIGTERM');
      }
    } catch (err: any) {
      if (err?.code === 'EPERM') {
        return {
          success: false,
          pid,
          status: 'running',
          code: 'PROCESS_PERMISSION_DENIED',
          message: `Permission denied while attempting to stop process (PID ${pid}). Administrator/root privileges required.`,
        };
      }
    }

    // 6. Polling verification for graceful exit (wait up to 600ms)
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (!this.isProcessAlive(pid)) {
        return {
          success: true,
          pid,
          status: 'stopped',
          message: `Process (PID ${pid}) stopped gracefully.`,
        };
      }
    }

    // 7. Stage 2: Force Termination Fallback (SIGKILL on Unix / taskkill /F on Windows)
    try {
      if (isWindows) {
        await safeExec('taskkill', ['/F', '/PID', String(pid)]);
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch (err: any) {
      if (err?.code === 'EPERM') {
        return {
          success: false,
          pid,
          status: 'running',
          code: 'PROCESS_PERMISSION_DENIED',
          message: `Permission denied while attempting to force terminate process (PID ${pid}).`,
        };
      }
    }

    // 8. Polling verification for force exit (wait up to 400ms)
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (!this.isProcessAlive(pid)) {
        return {
          success: true,
          pid,
          status: 'stopped',
          message: `Process (PID ${pid}) stopped successfully.`,
        };
      }
    }

    // 9. Final state evaluation
    const stillAlive = this.isProcessAlive(pid);
    if (!stillAlive) {
      return {
        success: true,
        pid,
        status: 'stopped',
        message: `Process (PID ${pid}) stopped.`,
      };
    }

    return {
      success: false,
      pid,
      status: 'running',
      code: 'PROCESS_DID_NOT_EXIT',
      message: `Process (PID ${pid}) did not exit within timeout. It may be hung or require elevated privileges.`,
    };
  }
}

export const processService = new ProcessService();
