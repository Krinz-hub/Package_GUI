import os from 'os';
import fs from 'fs';
import path from 'path';
import { OperatingSystemInfo, PortInfo, PlatformType } from '@stuff-manager/shared';
import { BasePlatform, PrivilegedResult } from './base-platform.js';
import { safeExec } from '../utils/exec.js';

export class LinuxPlatform implements BasePlatform {
  readonly type: PlatformType = 'linux';
  private scriptsDir: string;

  constructor() {
    this.scriptsDir = path.join(os.homedir(), '.package-gui', 'scripts');
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
    }
  }

  public async getOSInfo(): Promise<OperatingSystemInfo> {
    let distro = 'Linux';
    let displayName = `Linux (${os.arch()})`;

    try {
      if (fs.existsSync('/etc/os-release')) {
        const content = fs.readFileSync('/etc/os-release', 'utf-8');
        const prettyNameMatch = content.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
        const nameMatch = content.match(/^NAME="?([^"\n]+)"?/m);
        if (prettyNameMatch) {
          displayName = `${prettyNameMatch[1]} (${os.arch()})`;
          distro = nameMatch ? nameMatch[1] : 'Linux';
        }
      }
    } catch (_) {}

    const shellInfo = this.getDefaultShell();

    return {
      platform: 'linux',
      displayName,
      distro,
      release: os.release(),
      arch: os.arch(),
      kernel: os.release(),
      hostname: os.hostname(),
      uptime: Math.floor(os.uptime()),
      shell: shellInfo.shell,
      shellPath: shellInfo.shellPath,
    };
  }

  public getDefaultShell(): { shell: string; shellPath: string } {
    const shellPath = process.env.SHELL || '/bin/bash';
    const shell = path.basename(shellPath);
    return { shell, shellPath };
  }

  public async scanPorts(): Promise<PortInfo[]> {
    const ports: PortInfo[] = [];

    // Try `ss -tulpn` first
    const ssRes = await safeExec('ss', ['-tulpn'], { timeoutMs: 5000 });
    if (ssRes.exitCode === 0 && ssRes.stdout.trim()) {
      const lines = ssRes.stdout.split('\n').slice(1);
      for (const line of lines) {
        if (!line.includes('LISTEN')) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const proto = parts[0].toUpperCase().startsWith('TCP') ? 'TCP' : 'UDP';
          const localAddr = parts[4];
          const procPart = parts[6] || '';

          const portMatch = localAddr.match(/:(\d+)$/);
          const pidMatch = procPart.match(/pid=(\d+)/);
          const nameMatch = procPart.match(/users:\(\("([^"]+)"/);

          if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;
            const processName = nameMatch ? nameMatch[1] : 'process';
            const address = localAddr.slice(0, localAddr.lastIndexOf(':')) || '*';

            ports.push({
              port,
              protocol: proto as any,
              address,
              status: 'LISTENING',
              pid,
              processName,
              command: processName,
            });
          }
        }
      }
      if (ports.length > 0) return ports;
    }

    // Fallback to lsof if ss output empty
    const lsofRes = await safeExec('lsof', ['-iTCP', '-sTCP:LISTEN', '-n', '-P'], { timeoutMs: 5000 });
    if (lsofRes.exitCode === 0 && lsofRes.stdout.trim()) {
      const lines = lsofRes.stdout.split('\n').slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 9) {
          const processName = parts[0];
          const pid = parseInt(parts[1], 10);
          const namePart = parts[8];
          const portMatch = namePart.match(/:(\d+)$/);
          if (pid && portMatch) {
            const port = parseInt(portMatch[1], 10);
            const address = namePart.slice(0, namePart.lastIndexOf(':')) || '*';
            ports.push({
              port,
              protocol: 'TCP',
              address,
              status: 'LISTENING',
              pid,
              processName,
              command: processName,
            });
          }
        }
      }
    }

    return ports;
  }

  public async launchApplication(appPathOrName: string): Promise<{ success: boolean; message?: string }> {
    const res = await safeExec('xdg-open', [appPathOrName]);
    return {
      success: res.exitCode === 0,
      message: res.exitCode === 0 ? `Launched ${appPathOrName}` : res.stderr || 'Failed to launch application',
    };
  }

  public async runElevated(
    jobId: string,
    executable: string,
    args: string[],
    onProgress?: (msg: string) => void
  ): Promise<PrivilegedResult> {
    const scriptPath = path.join(this.scriptsDir, `job-${jobId}.sh`);
    const statusFile = path.join(this.scriptsDir, `job-${jobId}.status`);
    const logFile = path.join(this.scriptsDir, `job-${jobId}.log`);

    try {
      if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_) {}

    const fullCommand = `sudo ${executable} ${args.join(' ')}`;
    const scriptContent = `#!/bin/bash
clear
echo "======================================================="
echo "  PACKAGE GUI — Elevated Operation Runner (Linux)"
echo "  Running: ${executable} ${args.join(' ')}"
echo "======================================================="
echo ""

${fullCommand} 2>&1 | tee "${logFile}"
EXIT_CODE=\${PIPESTATUS[0]}

echo \$EXIT_CODE > "${statusFile}"
sleep 5
exit \$EXIT_CODE
`;

    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
    onProgress?.(`Opening terminal window for Linux authentication...`);

    // Try x-terminal-emulator or gnome-terminal or pkexec
    const termRes = await safeExec('x-terminal-emulator', ['-e', `bash '${scriptPath}'`]);
    if (termRes.exitCode !== 0) {
      await safeExec('gnome-terminal', ['--', 'bash', scriptPath]);
    }

    const maxWaitMs = 300000;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (fs.existsSync(statusFile)) {
          clearInterval(interval);
          try {
            const exitCodeStr = fs.readFileSync(statusFile, 'utf-8').trim();
            const exitCode = parseInt(exitCodeStr, 10) || 0;
            const output = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8') : '';

            try {
              fs.unlinkSync(scriptPath);
              fs.unlinkSync(statusFile);
            } catch (_) {}

            resolve({
              success: exitCode === 0,
              exitCode,
              output,
            });
          } catch (e: any) {
            resolve({
              success: false,
              exitCode: 1,
              output: `Error reading status: ${e.message}`,
            });
          }
        } else if (Date.now() - startTime > maxWaitMs) {
          clearInterval(interval);
          resolve({
            success: false,
            exitCode: 124,
            output: 'Operation timed out after 5 minutes.',
          });
        }
      }, 500);
    });
  }
}
