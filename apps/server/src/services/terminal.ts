import { spawn, ChildProcess } from 'child_process';
import { platform } from '../platform/platform.js';
import { sanitizeEnv } from '../utils/exec.js';
import type { WebSocket } from 'ws';

export class TerminalSession {
  private child: ChildProcess | null = null;
  private ws: WebSocket;
  private isAlive = true;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.init();
  }

  private init() {
    const { shell, shellPath } = platform.getDefaultShell();

    const env = {
      ...sanitizeEnv(),
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      PACKAGE_GUI: '1',
    };

    // Spawn interactive shell process
    const shellArgs = platform.type === 'win32' ? [] : ['-i'];

    try {
      this.child = spawn(shellPath, shellArgs, {
        env,
        cwd: process.env.HOME || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.ws.send(
        JSON.stringify({
          type: 'status',
          status: 'connected',
          data: `Connected to interactive terminal (${shell})\r\n`,
        })
      );

      this.child.stdout?.on('data', (data: Buffer) => {
        if (this.isAlive && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
        }
      });

      this.child.stderr?.on('data', (data: Buffer) => {
        if (this.isAlive && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
        }
      });

      this.child.on('close', (code) => {
        if (this.isAlive && this.ws.readyState === 1) {
          this.ws.send(
            JSON.stringify({
              type: 'status',
              status: 'closed',
              data: `\r\n[Process exited with code ${code}]\r\n`,
            })
          );
        }
        this.isAlive = false;
      });

      this.child.on('error', (err) => {
        if (this.isAlive && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({ type: 'output', data: `\r\nError: ${err.message}\r\n` }));
        }
      });
    } catch (err: any) {
      this.ws.send(JSON.stringify({ type: 'output', data: `Failed to spawn shell: ${err.message}\r\n` }));
    }

    this.ws.on('message', (msgStr: string) => {
      try {
        const msg = JSON.parse(msgStr.toString());
        if (msg.type === 'input' && typeof msg.data === 'string') {
          this.child?.stdin?.write(msg.data);
        } else if (msg.type === 'resize') {
          // If PTY supported, resize
        }
      } catch (_) {
        // Raw string input fallback
        this.child?.stdin?.write(msgStr.toString());
      }
    });

    this.ws.on('close', () => {
      this.destroy();
    });
  }

  public destroy() {
    this.isAlive = false;
    if (this.child) {
      try {
        this.child.kill('SIGTERM');
      } catch (_) {}
      this.child = null;
    }
  }
}

export class TerminalService {
  private sessions = new Set<TerminalSession>();

  public handleConnection(ws: WebSocket) {
    const session = new TerminalSession(ws);
    this.sessions.add(session);
    ws.on('close', () => {
      this.sessions.delete(session);
    });
  }
}

export const terminalService = new TerminalService();
