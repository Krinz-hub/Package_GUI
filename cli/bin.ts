#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import http from 'http';

const SERVER_PORT = 4173;
const WEB_PORT = 5173;

async function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser(url: string) {
  const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(openCmd, [url], { stdio: 'ignore', detached: true }).unref();
}

async function main() {
  console.log('\n🚀 Starting PACKAGE GUI (stuff-manager)...\n');

  const serverRunning = await isPortOpen(SERVER_PORT);
  if (serverRunning) {
    console.log(`✓ PACKAGE GUI server is already running on port ${SERVER_PORT}`);
    console.log(`🌐 Opening http://localhost:${SERVER_PORT} in your browser...`);
    openBrowser(`http://localhost:${SERVER_PORT}`);
    return;
  }

  // Start the server process
  const rootDir = path.resolve(__dirname, '..');
  const server = spawn('npm', ['run', 'dev', '-w', 'apps/server'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(SERVER_PORT) },
  });

  process.on('SIGINT', () => {
    server.kill();
    process.exit(0);
  });

  // Wait for server to become responsive
  let attempts = 0;
  const checkInterval = setInterval(async () => {
    attempts++;
    const ready = await isPortOpen(SERVER_PORT);
    if (ready) {
      clearInterval(checkInterval);
      console.log(`\n✨ PACKAGE GUI is ready at http://localhost:${SERVER_PORT}`);
      openBrowser(`http://localhost:${SERVER_PORT}`);
    } else if (attempts > 30) {
      clearInterval(checkInterval);
      console.log('⚠️ Server took too long to start. Please check terminal output.');
    }
  }, 500);
}

main().catch(console.error);
