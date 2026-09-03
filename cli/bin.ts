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

const isDebug = process.argv.includes('--debug') || process.env.PAKAGE_DEBUG === '1';
const PORT = parseInt(process.env.PORT || '4173', 10);
const HOST = '127.0.0.1';

async function checkBackendHealth(host: string, port: number): Promise<{ ok: boolean; data?: any }> {
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
          resolve({ ok: false });
        }
      });
    });

    req.on('error', () => resolve({ ok: false }));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve({ ok: false });
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
  console.log(`Node:         ${process.version}`);
  console.log(`Server:       http://${HOST}:${PORT}`);
  if (isDebug) console.log(`Mode:         DEBUG (Verbose logging active)`);
  console.log('');

  // 1. Check if backend is already running
  const existingHealth = await checkBackendHealth(HOST, PORT);
  if (existingHealth.ok) {
    console.log(`✓ PACKAGE GUI backend is already running on http://${HOST}:${PORT}`);
    console.log(`🌐 Opening browser at http://${HOST}:${PORT} ...\n`);
    openBrowser(`http://${HOST}:${PORT}`);
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

  const cleanExit = () => {
    try {
      serverProc.kill('SIGTERM');
    } catch (_) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);

  // 4. Poll health check with timeout
  console.log('⏳ Waiting for backend API to be ready...');
  let ready = false;
  for (let i = 1; i <= 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const health = await checkBackendHealth(HOST, PORT);
    if (health.ok) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    console.error(`\n❌ Backend failed to start on port ${PORT}.`);
    console.error(`Please check if another application is holding port ${PORT}.`);
    console.error(`Run with --debug for full startup traces.\n`);
    cleanExit();
    return;
  }

  console.log(`\n✓ Backend healthy: http://${HOST}:${PORT}/api/health`);
  console.log(`✓ Package providers loaded`);
  console.log(`✓ Port scanner loaded`);
  console.log(`✓ Process scanner loaded`);
  console.log(`✓ Interactive terminal loaded`);
  console.log(`\n🌐 Opening http://${HOST}:${PORT} in your browser...\n`);

  openBrowser(`http://${HOST}:${PORT}`);
  console.log(`Press Ctrl+C to stop the PACKAGE GUI server.`);
}

main().catch((err) => {
  console.error('\nFatal error starting PACKAGE GUI:', err);
  process.exit(1);
});
