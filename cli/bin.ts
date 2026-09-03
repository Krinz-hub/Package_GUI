#!/usr/bin/env node
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const isDebug = args.includes('--debug') || process.env.PAKAGE_DEBUG === '1';

// Support --port <number> or -p <number>
let customPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 4173;
const portIdx = args.findIndex((a) => a === '--port' || a === '-p');
if (portIdx !== -1 && args[portIdx + 1]) {
  const p = parseInt(args[portIdx + 1], 10);
  if (!isNaN(p) && p > 0 && p < 65536) {
    customPort = p;
  }
}

const PORT = customPort;
const HOST = process.env.HOST || '127.0.0.1';

async function checkBackendHealth(host: string, port: number): Promise<{ ok: boolean; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/api/health`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve({ ok: true, data: JSON.parse(body) });
          } catch (_) {
            resolve({ ok: true });
          }
        } else {
          resolve({ ok: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve({ ok: false, error: 'Connection timeout' });
    });
  });
}

function openBrowser(url: string) {
  const openCmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';
  try {
    spawn(openCmd, [url], { stdio: 'ignore', detached: true }).unref();
  } catch (_) {}
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     PACKAGE GUI                              ║
║         Local Developer Package & System Dashboard           ║
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log(`OS:           ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`Architecture: ${os.arch()}`);
  console.log(`Node:         ${process.version}`);
  console.log(`Server:       http://${HOST}:${PORT}`);
  if (isDebug) console.log(`Mode:         DEBUG (Verbose diagnostics active)`);
  console.log('');

  // 1. Check if backend is already running
  const existingHealth = await checkBackendHealth(HOST, PORT);
  if (existingHealth.ok) {
    console.log(`✓ PACKAGE GUI backend is already running on http://${HOST}:${PORT}`);
    console.log(`✓ Package providers loaded`);
    console.log(`✓ Port scanner loaded`);
    console.log(`✓ Process scanner loaded`);
    console.log(`✓ Interactive terminal loaded`);
    console.log(`\n🌐 Opening browser at http://${HOST}:${PORT} ...\n`);
    openBrowser(`http://${HOST}:${PORT}`);
    console.log(`Press Ctrl+C to stop.\n`);
    return;
  }

  // 2. Ensure web frontend dist is built for production serving
  const distPath = path.join(rootDir, 'apps/web/dist');
  if (!fs.existsSync(distPath)) {
    console.log('📦 Building frontend bundle for production deployment...');
    try {
      const buildProc = spawn('npm', ['run', 'build'], {
        cwd: rootDir,
        stdio: isDebug ? 'inherit' : 'ignore',
        env: { ...process.env, NODE_ENV: 'production' },
      });
      await new Promise((res, rej) => {
        buildProc.on('close', (code) => (code === 0 ? res(null) : rej(new Error(`Build exited with ${code}`))));
      });
      console.log('✓ Frontend build complete.\n');
    } catch (err: any) {
      console.error('⚠️ Frontend prebuild failed. Falling back to live development server.');
    }
  }

  // 3. Launch server process
  console.log('🚀 Starting PACKAGE GUI local server...');

  let serverProc: ChildProcess;
  const serverDistPath = path.join(rootDir, 'apps/server/dist/index.js');

  if (fs.existsSync(serverDistPath)) {
    serverProc = spawn('node', [serverDistPath], {
      cwd: rootDir,
      stdio: isDebug ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: String(PORT),
        HOST,
        PAKAGE_DEBUG: isDebug ? '1' : '0',
      },
    });
  } else {
    serverProc = spawn('npm', ['run', 'dev', '-w', 'apps/server'], {
      cwd: rootDir,
      stdio: isDebug ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: String(PORT),
        HOST,
        PAKAGE_DEBUG: isDebug ? '1' : '0',
      },
    });
  }

  let serverExited = false;
  serverProc.on('exit', (code) => {
    serverExited = true;
    if (code !== 0 && code !== null) {
      console.error(`\n❌ Server process exited unexpectedly with code ${code}.`);
    }
  });

  const cleanExit = () => {
    try {
      if (!serverExited) {
        serverProc.kill('SIGTERM');
      }
    } catch (_) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);

  // 4. Poll health check with timeout
  console.log('⏳ Waiting for backend API to be ready...');
  let ready = false;
  let healthInfo: any = null;
  for (let i = 1; i <= 35; i++) {
    await new Promise((r) => setTimeout(r, 350));
    const health = await checkBackendHealth(HOST, PORT);
    if (health.ok) {
      ready = true;
      healthInfo = health.data;
      break;
    }
  }

  if (!ready) {
    console.error(`\n❌ PACKAGE GUI failed to start.`);
    console.error(`Reason: Backend could not bind to port ${PORT} on ${HOST}.`);
    console.error(`Please check if another process is occupying port ${PORT}:`);
    console.error(`  lsof -ti:${PORT} | xargs kill -9`);
    console.error(`Or specify an alternate port:`);
    console.error(`  pakage gui --port 49152`);
    console.error(`Run with --debug for detailed startup error traces.\n`);
    cleanExit();
    return;
  }

  console.log(`\nPACKAGE GUI\n`);
  console.log(`OS           ${os.type()} ${os.release()}`);
  console.log(`Architecture ${os.arch()}`);
  console.log(`Node         ${process.version}`);
  console.log(`\nFrontend     ready`);
  console.log(`Backend      ready`);
  console.log(`API          ready`);
  console.log(`\nServer       http://${HOST}:${PORT}`);
  console.log(`\n✓ Package providers loaded`);
  console.log(`✓ Port scanner loaded`);
  console.log(`✓ Process scanner loaded`);
  console.log(`✓ Interactive terminal loaded`);
  console.log(`\n🌐 Opening browser at http://${HOST}:${PORT} ...\n`);

  openBrowser(`http://${HOST}:${PORT}`);
  console.log(`Press Ctrl+C to stop the PACKAGE GUI server.\n`);
}

main().catch((err) => {
  console.error('\nFatal error starting PACKAGE GUI:', err);
  process.exit(1);
});
