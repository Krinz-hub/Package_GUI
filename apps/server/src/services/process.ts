import { ProcessInfo } from '@stuff-manager/shared';
import { safeExec } from '../utils/exec.js';

export class ProcessService {
  public async getDevProcesses(): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];
    const portMap = new Map<number, number>(); // pid -> port

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
            portMap.set(pid, parseInt(portMatch[1], 10));
          }
        }
      }
    }

    // 2. Get process details with ps
    const psRes = await safeExec('ps', ['-eo', 'pid,user,%cpu,%mem,command'], { timeoutMs: 5000 });
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

          // Filter for relevant development processes or listening ports
          const isDevProcess = devKeywords.some((kw) => command.toLowerCase().includes(kw));
          const hasListeningPort = portMap.has(pid);

          if (isDevProcess || hasListeningPort) {
            const name = command.split(' ')[0].split('/').pop() || 'process';
            processes.push({
              pid,
              name,
              command: command.length > 120 ? command.slice(0, 117) + '...' : command,
              port: portMap.get(pid),
              cpu,
              memory,
              user,
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
