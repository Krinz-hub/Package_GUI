import os from 'os';
import fs from 'fs';
import path from 'path';
import { OperatingSystemInfo, PortInfo, PlatformType } from '@stuff-manager/shared';
import { BasePlatform, PrivilegedResult } from './base-platform.js';
import { safeExec } from '../utils/exec.js';

export class MacOSPlatform implements BasePlatform {
  readonly type: PlatformType = 'darwin';
  private scriptsDir: string;

  constructor() {
    this.scriptsDir = path.join(os.homedir(), '.package-gui', 'scripts');
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
    }
  }

  public async getOSInfo(): Promise<OperatingSystemInfo> {
    let macVersion = os.release();
    try {
      const swRes = await safeExec('sw_vers', ['-productVersion']);
      if (swRes.exitCode === 0 && swRes.stdout.trim()) {
        macVersion = swRes.stdout.trim();
      }
    } catch (_) {}

    const arch = os.arch() === 'arm64' ? 'Apple Silicon (arm64)' : 'Intel (x64)';
    const shellInfo = this.getDefaultShell();

    return {
      platform: 'darwin',
      displayName: `macOS ${macVersion} (${arch})`,
      distro: 'macOS',
      release: macVersion,
      arch: os.arch(),
      kernel: os.release(),
      hostname: os.hostname(),
      uptime: Math.floor(os.uptime()),
      shell: shellInfo.shell,
      shellPath: shellInfo.shellPath,
    };
  }

  public getDefaultShell(): { shell: string; shellPath: string } {
    const shellPath = process.env.SHELL || '/bin/zsh';
    const shell = path.basename(shellPath);
    return { shell, shellPath };
  }

  public async scanPorts(): Promise<PortInfo[]> {
    const ports: PortInfo[] = [];
    // Run lsof -iTCP -sTCP:LISTEN -n -P
    const res = await safeExec('lsof', ['-iTCP', '-sTCP:LISTEN', '-n', '-P'], { timeoutMs: 5000 });
    if (res.exitCode === 0 && res.stdout.trim()) {
      const lines = res.stdout.split('\n').slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 9) {
          const processName = parts[0];
          const pid = parseInt(parts[1], 10);
          const user = parts[2];
          const protoPart = parts[4].toUpperCase().includes('IPV6') ? 'TCP' : 'TCP';
          const namePart = parts[8];

          // Address and port parsing (e.g. *:5173, 127.0.0.1:4173, [::1]:5000)
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
              user,
            });
          }
        }
      }
    }
    return ports;
  }

  public async launchApplication(appPathOrName: string): Promise<{ success: boolean; message?: string }> {
    let args: string[] = [];
    if (appPathOrName.startsWith('/') || appPathOrName.endsWith('.app')) {
      args = [appPathOrName];
    } else {
      args = ['-a', appPathOrName];
    }

    const res = await safeExec('open', args);
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
echo "  PACKAGE GUI — Elevated Operation Runner (macOS)"
echo "  Running: ${executable} ${args.join(' ')}"
echo "======================================================="
echo ""
echo "macOS requires administrator permissions."
echo "Please enter your password below if prompted:"
echo ""

${fullCommand} 2>&1 | tee "${logFile}"
EXIT_CODE=\${PIPESTATUS[0]}

echo ""
if [ \$EXIT_CODE -eq 0 ]; then
  echo "======================================================="
  echo "✓ Operation finished successfully! (Exit code: 0)"
  echo "======================================================="
else
  echo "======================================================="
  echo "✗ Operation failed with exit code: \$EXIT_CODE"
  echo "======================================================="
fi

echo \$EXIT_CODE > "${statusFile}"
echo ""
echo "Closing in 5 seconds..."
sleep 5
exit \$EXIT_CODE
`;

    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
    onProgress?.(`Opening native macOS Terminal to authenticate and execute...`);

    const appleScript = `
      tell application "Terminal"
        activate
        do script "bash '${scriptPath}'"
      end tell
    `;

    await safeExec('osascript', ['-e', appleScript]);

    // Poll for status file
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
            output: 'Terminal operation timed out after 5 minutes.',
          });
        }
      }, 500);
    });
  }
}
