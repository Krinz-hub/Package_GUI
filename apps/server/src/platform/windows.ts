import os from 'os';
import fs from 'fs';
import path from 'path';
import { OperatingSystemInfo, PortInfo, PlatformType } from '@stuff-manager/shared';
import { BasePlatform, PrivilegedResult } from './base-platform.js';
import { safeExec } from '../utils/exec.js';

export class WindowsPlatform implements BasePlatform {
  readonly type: PlatformType = 'win32';
  private scriptsDir: string;

  constructor() {
    this.scriptsDir = path.join(os.homedir(), '.package-gui', 'scripts');
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
    }
  }

  public async getOSInfo(): Promise<OperatingSystemInfo> {
    const winVer = os.release();
    const isWin11 = parseInt(winVer.split('.')[2] || '0', 10) >= 22000;
    const displayName = `${isWin11 ? 'Windows 11' : 'Windows 10'} (${os.arch()})`;
    const shellInfo = this.getDefaultShell();

    return {
      platform: 'win32',
      displayName,
      distro: 'Windows',
      release: winVer,
      arch: os.arch(),
      kernel: os.version ? os.version() : winVer,
      hostname: os.hostname(),
      uptime: Math.floor(os.uptime()),
      shell: shellInfo.shell,
      shellPath: shellInfo.shellPath,
    };
  }

  public getDefaultShell(): { shell: string; shellPath: string } {
    const comspec = process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
    // Prefer PowerShell if available
    const pwshPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    if (fs.existsSync(pwshPath)) {
      return { shell: 'PowerShell', shellPath: pwshPath };
    }
    return { shell: path.basename(comspec, '.exe'), shellPath: comspec };
  }

  public async scanPorts(): Promise<PortInfo[]> {
    const ports: PortInfo[] = [];
    const res = await safeExec('netstat', ['-ano', '-p', 'tcp'], { timeoutMs: 5000 });
    if (res.exitCode === 0 && res.stdout.trim()) {
      const lines = res.stdout.split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^TCP\s+([^\s]+)\s+([^\s]+)\s+LISTENING\s+(\d+)/i);
        if (match) {
          const localAddr = match[1];
          const pid = parseInt(match[3], 10);
          const portMatch = localAddr.match(/:(\d+)$/);
          if (pid && portMatch) {
            const port = parseInt(portMatch[1], 10);
            const address = localAddr.slice(0, localAddr.lastIndexOf(':')) || '0.0.0.0';

            ports.push({
              port,
              protocol: 'TCP',
              address,
              status: 'LISTENING',
              pid,
              processName: 'System/Process',
              command: `PID ${pid}`,
            });
          }
        }
      }
    }
    return ports;
  }

  public async launchApplication(appPathOrName: string): Promise<{ success: boolean; message?: string }> {
    const res = await safeExec('cmd.exe', ['/c', 'start', '""', appPathOrName]);
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
    const scriptPath = path.join(this.scriptsDir, `job-${jobId}.ps1`);
    const statusFile = path.join(this.scriptsDir, `job-${jobId}.status`);
    const logFile = path.join(this.scriptsDir, `job-${jobId}.log`);

    try {
      if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_) {}

    const scriptContent = `
Clear-Host
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  PACKAGE GUI — Elevated Operation Runner (Windows)" -ForegroundColor Cyan
Write-Host "  Running: ${executable} ${args.join(' ')}" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

& "${executable}" ${args.map((a) => `"${a}"`).join(' ')} *>&1 | Tee-Object -FilePath "${logFile}"
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
  Write-Host "✓ Operation finished successfully!" -ForegroundColor Green
} else {
  Write-Host "✗ Operation failed with code: $exitCode" -ForegroundColor Red
}

$exitCode | Out-File -FilePath "${statusFile}" -Encoding ASCII
Start-Sleep -Seconds 5
exit $exitCode
`;

    fs.writeFileSync(scriptPath, scriptContent);
    onProgress?.(`Triggering Windows UAC elevation prompt...`);

    // Run powershell Start-Process with -Verb RunAs
    const psCommand = `Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"' -Verb RunAs`;
    await safeExec('powershell.exe', ['-Command', psCommand]);

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
