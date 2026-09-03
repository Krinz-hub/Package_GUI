import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { safeExec } from '../utils/exec.js';

export interface PrivilegedExecutionResult {
  success: boolean;
  exitCode: number;
  output: string;
}

export class MacOSTerminalRunner {
  private scriptsDir: string;

  constructor() {
    this.scriptsDir = path.join(os.homedir(), '.package-gui', 'scripts');
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
    }
  }

  /**
   * Runs a command in macOS Terminal.app with privilege support.
   * macOS handles authentication natively — passwords never touch the browser or server.
   */
  public async runInTerminal(
    jobId: string,
    command: string,
    args: string[],
    useSudo = true,
    onProgress?: (msg: string) => void
  ): Promise<PrivilegedExecutionResult> {
    const scriptPath = path.join(this.scriptsDir, `job-${jobId}.sh`);
    const statusFile = path.join(this.scriptsDir, `job-${jobId}.status`);
    const logFile = path.join(this.scriptsDir, `job-${jobId}.log`);

    // Clean up old status/log files
    try {
      if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_) {}

    // Build the script content
    const fullCommand = useSudo ? `sudo ${command} ${args.join(' ')}` : `${command} ${args.join(' ')}`;
    const scriptContent = `#!/bin/bash
clear
echo "======================================================="
echo "  PACKAGE GUI — Elevated Operation Runner"
echo "  Running: ${command} ${args.join(' ')}"
echo "======================================================="
echo ""
echo "macOS requires administrator permissions."
echo "Please enter your password below if prompted:"
echo ""

# Execute command while streaming to terminal and log file
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
echo "You can close this Terminal window now, or it will close automatically in 5 seconds."
sleep 5
exit \$EXIT_CODE
`;

    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    onProgress?.(`Launching macOS Terminal to perform operation with elevated privileges...`);

    // Launch AppleScript to open Terminal and run the script
    const appleScript = `
      tell application "Terminal"
        activate
        do script "bash '${scriptPath}'"
      end tell
    `;

    await safeExec('osascript', ['-e', appleScript]);

    onProgress?.(`Terminal window launched. Waiting for native macOS authentication and completion...`);

    // Wait for the status file to be written (poll every 500ms up to 5 minutes)
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
            
            // Clean up temporary script
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

export const terminalRunner = new MacOSTerminalRunner();
