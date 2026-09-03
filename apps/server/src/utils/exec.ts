import { spawn, execFile, ExecFileOptions } from 'child_process';
import os from 'os';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Security: Strict validation of package identifiers to prevent argument/shell injection
export function validatePackageName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  // Allows letters, digits, @ (scoped npm packages), /, ., -, _, +
  return /^[a-zA-Z0-9@_][a-zA-Z0-9@_\.\-\/\+]*$/.test(name.trim());
}

export function sanitizeEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  // Ensure standard homebrew and local bin paths are included
  const standardPaths = [
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    `${os.homedir()}/Library/Android/sdk/platform-tools`,
    `${os.homedir()}/.cargo/bin`,
  ];
  const currentPath = env.PATH || '';
  const currentPathArr = currentPath.split(':');
  for (const p of standardPaths) {
    if (!currentPathArr.includes(p)) {
      currentPathArr.unshift(p);
    }
  }
  env.PATH = currentPathArr.join(':');
  env.HOMEBREW_NO_AUTO_UPDATE = '1';
  env.HOMEBREW_NO_ENV_HINTS = '1';
  env.NO_COLOR = '1';
  return env;
}

export async function safeExec(
  executable: string,
  args: string[],
  options: {
    cwd?: string;
    timeoutMs?: number;
    onStdout?: (chunk: string) => void;
    onStderr?: (chunk: string) => void;
  } = {}
): Promise<ExecResult> {
  const timeoutMs = options.timeoutMs ?? 120000; // Default 2 minute timeout

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: sanitizeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        resolve({
          stdout,
          stderr: stderr + `\n[Command timed out after ${timeoutMs / 1000}s]`,
          exitCode: 124,
        });
      }
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      options.onStdout?.(text);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      options.onStderr?.(text);
    });

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          stdout,
          stderr: stderr + `\n${err.message}`,
          exitCode: 1,
        });
      }
    });

    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
        });
      }
    });
  });
}
