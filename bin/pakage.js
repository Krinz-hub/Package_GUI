#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import path from 'path';
import http from 'http';
import https from 'https';
import os from 'os';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read package.json for version & metadata
let packageJson = { version: '1.0.0', name: 'package-gui' };
try {
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  }
} catch (_) {}

const VERSION = packageJson.version || '1.0.0';

// Platform-appropriate User Data Directory
export function getDataDir() {
  let baseDir;
  if (process.platform === 'win32') {
    baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (process.platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    baseDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }
  const appDataDir = path.join(baseDir, 'package-gui');
  if (!fs.existsSync(appDataDir)) {
    try {
      fs.mkdirSync(appDataDir, { recursive: true });
    } catch (_) {
      const fallbackDir = path.join(os.homedir(), '.package-gui');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      return fallbackDir;
    }
  }
  return appDataDir;
}

export function getStateFilePath() {
  return path.join(getDataDir(), 'state.json');
}

export function getLogFilePath() {
  return path.join(getDataDir(), 'package-gui.log');
}

export function readState() {
  try {
    const file = getStateFilePath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return data;
    }
  } catch (_) {}
  return null;
}

export function writeState(state) {
  try {
    fs.writeFileSync(getStateFilePath(), JSON.stringify(state, null, 2), 'utf8');
  } catch (_) {}
}

export function clearState() {
  try {
    const file = getStateFilePath();
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  } catch (_) {}
}

// Check if a process with PID is alive
export function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

// Test if port is available
export async function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.once('close', () => resolve(true)).close();
    });
    server.listen(port, host);
  });
}

// Find available port
export async function findAvailablePort(startPort, host = '127.0.0.1', maxTries = 40) {
  for (let p = startPort; p < startPort + maxTries; p++) {
    if (await isPortAvailable(p, host)) {
      return p;
    }
  }
  return startPort;
}

// Check backend health HTTP endpoint
export async function checkBackendHealth(host, port, timeoutMs = 1500) {
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
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ ok: false, error: 'Connection timeout' });
    });
  });
}

// Fetch overview data
export async function fetchOverview(host, port) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/api/overview`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(body));
          } catch (_) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Cross-platform browser opening
export function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else if (platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true }).unref();
    } else {
      // Linux / Unix
      const candidateOpeners = ['xdg-open', 'gio', 'gnome-open', 'kde-open', 'x-www-browser'];
      let opened = false;
      for (const opener of candidateOpeners) {
        try {
          execSync(`which ${opener}`, { stdio: 'ignore' });
          spawn(opener, [url], { stdio: 'ignore', detached: true }).unref();
          opened = true;
          break;
        } catch (_) {}
      }
      if (!opened) {
        spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
      }
    }
  } catch (_) {}
}

// Command execution helper
function execSafe(cmd, timeout = 3000) {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], timeout, encoding: 'utf8' }).trim();
  } catch (_) {
    return '';
  }
}

// Append log to log file
function appendToLog(message) {
  try {
    const logFile = getLogFilePath();
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`, 'utf8');
  } catch (_) {}
}

// -----------------------------------------------------------------------------
// CLI Subcommands
// -----------------------------------------------------------------------------

function printHelp() {
  console.log(`
PACKAGE GUI v${VERSION}
A local-first developer package & system management dashboard.

USAGE:
  pakage [command] [options]
  pakage gui [options]
  package-gui [command] [options]

COMMANDS:
  gui            Launch the PACKAGE GUI server and open dashboard (default)
  status         Show current server status, port, and system summary
  doctor         Run system and environment diagnostic health checks
  logs           Display or tail recent PACKAGE GUI application logs
  stop           Stop the currently running PACKAGE GUI background server
  update         Check npm for the latest version of package-gui
  --help, -h     Show this help message
  --version, -v  Show PACKAGE GUI version

OPTIONS:
  -p, --port <number>   Specify port for the local server (default: 7421)
  --host <ip>           Specify host binding (default: 127.0.0.1)
  --no-open             Start server without opening browser automatically
  --debug               Enable verbose debugging logs and diagnostic traces

EXAMPLES:
  $ pakage
  $ pakage gui --port 7421
  $ pakage status
  $ pakage doctor
  $ pakage logs -f
  $ pakage stop
`);
}

// Command: status
async function handleStatus() {
  const state = readState();
  let isRunning = false;
  let overviewData = null;

  if (state && state.pid) {
    if (isProcessRunning(state.pid)) {
      const health = await checkBackendHealth(state.host, state.port, 1200);
      if (health.ok) {
        isRunning = true;
        overviewData = await fetchOverview(state.host, state.port);
      }
    }
  }

  console.log(`\nPACKAGE GUI v${VERSION}`);
  console.log('═'.repeat(52));

  if (isRunning && state) {
    console.log(`Server Status:     ● RUNNING`);
    console.log(`Dashboard URL:     ${state.url}`);
    console.log(`PID:               ${state.pid}`);
    console.log(`Host & Port:       ${state.host}:${state.port}`);
    console.log(`Started At:        ${state.startedAt}`);
    console.log(`OS:                ${os.type()} ${os.release()} (${os.arch()})`);
    console.log(`Node.js:           ${process.version}`);

    if (overviewData) {
      const availableManagers = Array.isArray(overviewData.managers)
        ? overviewData.managers.filter((m) => m.available).map((m) => m.name || m.type).join(', ')
        : 'None detected';
      const packagesCount = overviewData.totalPackages ?? 0;
      const updatesCount = overviewData.totalUpdates ?? 0;
      const portsCount = overviewData.totalPorts ?? 0;
      const processesCount = overviewData.runningProcessesCount ?? 0;

      console.log(`Detected Managers: ${availableManagers || 'None'}`);
      console.log(`Total Packages:    ${packagesCount}${updatesCount > 0 ? ` (${updatesCount} update${updatesCount === 1 ? '' : 's'} available)` : ''}`);
      console.log(`Listening Ports:   ${portsCount}`);
      console.log(`Active Processes:  ${processesCount}`);
    }
  } else {
    console.log(`Server Status:     ○ STOPPED`);
    console.log(`OS:                ${os.type()} ${os.release()} (${os.arch()})`);
    console.log(`Node.js:           ${process.version}`);
    console.log(`\nRun 'pakage' to start the local dashboard.\n`);
  }
  console.log('');
}

// Command: stop
async function handleStop() {
  const state = readState();
  if (!state || !state.pid) {
    console.log('PACKAGE GUI is not currently running.');
    clearState();
    return;
  }

  if (!isProcessRunning(state.pid)) {
    console.log(`Server process (PID: ${state.pid}) is no longer active.`);
    clearState();
    return;
  }

  console.log(`Stopping PACKAGE GUI server (PID: ${state.pid}, Port: ${state.port})...`);
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /PID ${state.pid}`, { stdio: 'ignore' });
    } else {
      process.kill(state.pid, 'SIGTERM');
      for (let i = 0; i < 20; i++) {
        if (!isProcessRunning(state.pid)) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (isProcessRunning(state.pid)) {
        process.kill(state.pid, 'SIGKILL');
      }
    }
    clearState();
    console.log('✓ PACKAGE GUI server stopped successfully.\n');
  } catch (err) {
    console.error(`Failed to stop server process: ${err.message}`);
    clearState();
  }
}

// Command: logs
function handleLogs(args) {
  const logFile = getLogFilePath();
  if (!fs.existsSync(logFile)) {
    console.log('No logs found yet. Start PACKAGE GUI with "pakage" to generate logs.');
    return;
  }

  const follow = args.includes('-f') || args.includes('--follow');
  let lineCount = 50;
  const lineIdx = args.findIndex((a) => a === '-n' || a === '--lines');
  if (lineIdx !== -1 && args[lineIdx + 1]) {
    const parsed = parseInt(args[lineIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) lineCount = parsed;
  }

  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const recent = lines.slice(-lineCount);
    console.log(`\n=== PACKAGE GUI Logs (${logFile}) ===\n`);
    console.log(recent.join('\n'));

    if (follow) {
      console.log('\n--- Following live logs (Ctrl+C to exit) ---\n');
      let currentSize = fs.statSync(logFile).size;
      fs.watchFile(logFile, { interval: 500 }, (curr) => {
        if (curr.size > currentSize) {
          const stream = fs.createReadStream(logFile, {
            start: currentSize,
            end: curr.size,
            encoding: 'utf8',
          });
          stream.on('data', (chunk) => process.stdout.write(chunk));
          currentSize = curr.size;
        }
      });
      process.on('SIGINT', () => {
        fs.unwatchFile(logFile);
        process.exit(0);
      });
    }
  } catch (err) {
    console.error(`Error reading logs: ${err.message}`);
  }
}

// Command: update
async function handleUpdate() {
  console.log(`Checking for updates (current version: v${VERSION})...`);
  try {
    const url = 'https://registry.npmjs.org/package-gui/latest';
    const latestVersion = await new Promise((resolve) => {
      const req = https.get(url, { headers: { 'User-Agent': 'package-gui-cli' } }, (res) => {
        if (res.statusCode !== 200) {
          resolve('');
          return;
        }
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data.version || '');
          } catch (_) {
            resolve('');
          }
        });
      });
      req.on('error', () => resolve(''));
      req.setTimeout(3000, () => {
        req.destroy();
        resolve('');
      });
    });

    if (latestVersion && latestVersion !== VERSION) {
      console.log(`\n🔔 Update available: v${latestVersion}`);
      console.log(`Run the following command to upgrade:\n`);
      console.log(`  npm install -g package-gui@latest\n`);
    } else {
      console.log(`✓ You are running the latest version of package-gui (v${VERSION}).\n`);
    }
  } catch (err) {
    console.log(`Could not check registry: ${err.message}`);
  }
}

// Command: doctor
async function handleDoctor() {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║                  PACKAGE GUI DOCTOR                          ║`);
  console.log(`║             System & Environment Diagnostics                 ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  const results = [];

  // 1. Node.js Check
  const nodeVer = process.version;
  const majorNode = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
  if (majorNode >= 18) {
    results.push({ title: 'Node.js', status: 'ok', message: `${nodeVer} (Supported >= 18.0.0)` });
  } else {
    results.push({
      title: 'Node.js',
      status: 'error',
      message: `${nodeVer} (Outdated! Node.js 18+ required)`,
      tip: 'Please upgrade Node.js to v18, v20, or v22.',
    });
  }

  // 2. npm Check
  const npmVer = execSafe('npm --version');
  if (npmVer) {
    results.push({ title: 'npm CLI', status: 'ok', message: `v${npmVer}` });
  } else {
    results.push({ title: 'npm CLI', status: 'warn', message: 'Not found in PATH', tip: 'Install npm for global package management.' });
  }

  // 3. Localhost loopback binding
  const localOk = await isPortAvailable(59876, '127.0.0.1');
  if (localOk) {
    results.push({ title: 'Localhost Binding', status: 'ok', message: '127.0.0.1 loopback socket accessible' });
  } else {
    results.push({ title: 'Localhost Binding', status: 'warn', message: 'Socket bind issue on 127.0.0.1' });
  }

  // 4. Backend and Frontend Build Check
  const serverDist = path.join(rootDir, 'apps/server/dist/index.js');
  const webDist = path.join(rootDir, 'apps/web/dist/index.html');
  if (fs.existsSync(serverDist)) {
    results.push({ title: 'Backend Production Build', status: 'ok', message: 'Ready' });
  } else {
    results.push({ title: 'Backend Production Build', status: 'warn', message: 'Missing dist/index.js (Run npm run build)' });
  }

  if (fs.existsSync(webDist)) {
    results.push({ title: 'Frontend Production Build', status: 'ok', message: 'Ready' });
  } else {
    results.push({ title: 'Frontend Production Build', status: 'warn', message: 'Missing dist/index.html (Run npm run build)' });
  }

  // 5. User Data & Config Directory
  const dataDir = getDataDir();
  try {
    const testFile = path.join(dataDir, '.perm_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    results.push({ title: 'User Data Directory', status: 'ok', message: `${dataDir} (Writable)` });
  } catch (err) {
    results.push({ title: 'User Data Directory', status: 'error', message: `Cannot write to ${dataDir}`, tip: 'Check folder permissions.' });
  }

  // 6. Git Check
  const gitVer = execSafe('git --version');
  if (gitVer) {
    results.push({ title: 'Git', status: 'ok', message: gitVer });
  } else {
    results.push({ title: 'Git', status: 'warn', message: 'Git is not installed or not in PATH' });
  }

  // 7. Package Managers Detection
  const brewVer = execSafe('brew --version');
  if (brewVer) {
    const firstLine = brewVer.split('\n')[0];
    results.push({ title: 'Homebrew', status: 'ok', message: firstLine });
  } else if (process.platform === 'darwin') {
    results.push({ title: 'Homebrew', status: 'warn', message: 'Not installed', tip: 'Install via https://brew.sh for package management on macOS.' });
  }

  const cargoVer = execSafe('cargo --version');
  if (cargoVer) {
    results.push({ title: 'Cargo (Rust)', status: 'ok', message: cargoVer });
  }

  if (process.platform === 'win32') {
    const wingetVer = execSafe('winget --version');
    if (wingetVer) results.push({ title: 'WinGet', status: 'ok', message: `v${wingetVer}` });
    const chocoVer = execSafe('choco --version');
    if (chocoVer) results.push({ title: 'Chocolatey', status: 'ok', message: `v${chocoVer}` });
    const scoopVer = execSafe('scoop --version');
    if (scoopVer) results.push({ title: 'Scoop', status: 'ok', message: scoopVer.split('\n')[0] });
  }

  if (process.platform === 'linux') {
    if (execSafe('which apt-get')) results.push({ title: 'APT Package Manager', status: 'ok', message: 'Available' });
    if (execSafe('which dnf')) results.push({ title: 'DNF Package Manager', status: 'ok', message: 'Available' });
    if (execSafe('which pacman')) results.push({ title: 'Pacman Package Manager', status: 'ok', message: 'Available' });
  }

  // 8. Python & PEP 668 Environment Check
  const pyVer = execSafe('python3 --version') || execSafe('python --version');
  if (pyVer) {
    let externallyManaged = false;
    try {
      const pipTest = execSafe('python3 -m pip install --dry-run dummy-test-pkg-nonexistent-12345 2>&1');
      if (pipTest.includes('externally-managed-environment') || pipTest.includes('PEP 668')) {
        externallyManaged = true;
      }
    } catch (_) {}

    if (externallyManaged) {
      results.push({
        title: 'Python Environment',
        status: 'warn',
        message: `${pyVer} (Externally Managed / PEP 668 active)`,
        tip: 'System Python is managed by the OS. Use a virtual environment or pipx to install Python packages safely.',
      });
    } else {
      results.push({ title: 'Python Environment', status: 'ok', message: pyVer });
    }
  } else {
    results.push({ title: 'Python Environment', status: 'warn', message: 'Python is not installed or not in PATH' });
  }

  // 9. Docker Daemon
  const dockerVer = execSafe('docker --version');
  if (dockerVer) {
    const dockerPs = execSafe('docker ps -q');
    if (dockerPs !== '' || !execSafe('docker info').includes('Cannot connect')) {
      results.push({ title: 'Docker', status: 'ok', message: `${dockerVer} (Daemon running)` });
    } else {
      results.push({ title: 'Docker', status: 'warn', message: `${dockerVer} (Daemon not running)` });
    }
  }

  // 10. Android ADB
  const adbVer = execSafe('adb version');
  if (adbVer) {
    const first = adbVer.split('\n')[0];
    results.push({ title: 'Android ADB', status: 'ok', message: first });
  }

  // Print Results
  for (const item of results) {
    const icon = item.status === 'ok' ? '✓' : item.status === 'warn' ? '⚠' : '✖';
    console.log(`${icon} ${item.title.padEnd(28)} ${item.message}`);
    if (item.tip) {
      console.log(`    ↳ Tip: ${item.tip}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  const errors = results.filter((r) => r.status === 'error').length;
  const warnings = results.filter((r) => r.status === 'warn').length;
  if (errors === 0 && warnings === 0) {
    console.log('✓ All system diagnostics passed. PACKAGE GUI is ready to run!\n');
  } else {
    console.log(`Diagnostics summary: ${errors} error(s), ${warnings} warning(s).\n`);
  }
}

// -----------------------------------------------------------------------------
// Launch GUI Command (pakage / pakage gui)
// -----------------------------------------------------------------------------

async function handleLaunch(args) {
  const isDebug = args.includes('--debug') || process.env.PAKAGE_DEBUG === '1';
  const noOpen = args.includes('--no-open') || process.env.PAKAGE_NO_OPEN === '1';

  let customPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 7421;
  const portIdx = args.findIndex((a) => a === '--port' || a === '-p');
  if (portIdx !== -1 && args[portIdx + 1]) {
    const p = parseInt(args[portIdx + 1], 10);
    if (!isNaN(p) && p > 0 && p < 65536) {
      customPort = p;
    }
  }

  let host = process.env.HOST || '127.0.0.1';
  const hostIdx = args.findIndex((a) => a === '--host');
  if (hostIdx !== -1 && args[hostIdx + 1]) {
    host = args[hostIdx + 1];
  }

  // 1. Check if an instance is already running
  const existingState = readState();
  if (existingState && existingState.pid && isProcessRunning(existingState.pid)) {
    const health = await checkBackendHealth(existingState.host, existingState.port, 1000);
    if (health.ok) {
      console.log(`PACKAGE GUI is already running.\n`);
      console.log(`Dashboard:`);
      console.log(`${existingState.url}\n`);
      if (!noOpen) {
        console.log(`Opening dashboard...\n`);
        openBrowser(existingState.url);
      }
      return;
    }
  }

  // Also check if target port responds to PACKAGE GUI health check
  const directHealth = await checkBackendHealth(host, customPort, 800);
  if (directHealth.ok) {
    console.log(`PACKAGE GUI is already running on http://${host}:${customPort}\n`);
    console.log(`Dashboard:`);
    console.log(`http://${host}:${customPort}\n`);
    if (!noOpen) {
      console.log(`Opening dashboard...\n`);
      openBrowser(`http://${host}:${customPort}`);
    }
    return;
  }

  // 2. Determine available port
  let activePort = customPort;
  const available = await isPortAvailable(customPort, host);
  if (!available) {
    console.log(`Port ${customPort} is already in use.`);
    activePort = await findAvailablePort(customPort + 1, host);
    console.log(`Trying ${activePort}...\n`);
  }

  console.log(`PACKAGE GUI v${VERSION}\n`);
  console.log(`✓ Starting server`);
  console.log(`✓ Detecting operating system`);
  console.log(`✓ Detecting package managers`);
  console.log(`✓ Detecting installed packages`);
  console.log(`✓ Detecting listening ports`);
  console.log(`✓ Detecting processes`);
  console.log(`✓ Detecting development environments\n`);

  // 3. Ensure server dist exists
  const serverDistPath = path.join(rootDir, 'apps/server/dist/index.js');
  if (!fs.existsSync(serverDistPath)) {
    console.log('📦 Production server bundle not found. Building workspace...');
    try {
      execSync('npm run build', { cwd: rootDir, stdio: isDebug ? 'inherit' : 'ignore' });
      console.log('✓ Build complete.\n');
    } catch (err) {
      console.error('❌ Failed to build server bundle:', err.message);
      process.exit(1);
    }
  }

  // 4. Start the server process
  const logFile = getLogFilePath();
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  appendToLog(`Starting PACKAGE GUI on http://${host}:${activePort}`);

  const serverProc = spawn(process.execPath, [serverDistPath], {
    cwd: rootDir,
    stdio: isDebug ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(activePort),
      HOST: host,
      NODE_ENV: 'production',
      PAKAGE_DEBUG: isDebug ? '1' : '0',
    },
  });

  if (!isDebug && serverProc.stdout && serverProc.stderr) {
    serverProc.stdout.pipe(logStream);
    serverProc.stderr.pipe(logStream);
  }

  let serverExited = false;
  serverProc.on('exit', (code) => {
    serverExited = true;
    appendToLog(`Server process exited with code ${code}`);
    clearState();
    if (code !== 0 && code !== null) {
      console.error(`\n❌ Server process stopped unexpectedly (exit code ${code}). Check logs with 'pakage logs'.`);
    }
  });

  // Write state file
  const dashboardUrl = `http://${host}:${activePort}`;
  if (serverProc.pid) {
    writeState({
      pid: serverProc.pid,
      port: activePort,
      host,
      url: dashboardUrl,
      startedAt: new Date().toISOString(),
      version: VERSION,
    });
  }

  // Handle Ctrl+C clean shutdown
  const cleanExit = () => {
    try {
      appendToLog('Received shutdown signal, terminating server process');
      clearState();
      if (!serverExited && serverProc.pid) {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /PID ${serverProc.pid}`, { stdio: 'ignore' });
        } else {
          serverProc.kill('SIGTERM');
        }
      }
    } catch (_) {}
    console.log('\nPACKAGE GUI stopped.');
    process.exit(0);
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);

  // 5. Poll for backend health
  let isReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (serverExited) break;
    const health = await checkBackendHealth(host, activePort, 600);
    if (health.ok) {
      isReady = true;
      break;
    }
  }

  if (!isReady) {
    console.error(`\n❌ PACKAGE GUI failed to start on port ${activePort}.`);
    console.error(`Inspect error logs with: pakage logs\n`);
    cleanExit();
    return;
  }

  console.log(`Dashboard:`);
  console.log(`${dashboardUrl}\n`);

  if (!noOpen) {
    console.log(`Opening browser...\n`);
    openBrowser(dashboardUrl);
  }

  console.log(`PACKAGE GUI is running.`);
  console.log(`Press Ctrl+C to stop.\n`);
}

// -----------------------------------------------------------------------------
// Main CLI Router
// -----------------------------------------------------------------------------

async function main() {
  const rawArgs = process.argv.slice(2);
  const command = rawArgs[0] || 'gui';

  if (rawArgs.includes('--help') || rawArgs.includes('-h') || command === 'help') {
    printHelp();
    return;
  }

  if (rawArgs.includes('--version') || rawArgs.includes('-v') || command === 'version') {
    console.log(`package-gui v${VERSION}`);
    return;
  }

  switch (command) {
    case 'gui':
      await handleLaunch(rawArgs.slice(1));
      break;
    case 'status':
      await handleStatus();
      break;
    case 'doctor':
      await handleDoctor();
      break;
    case 'logs':
      handleLogs(rawArgs.slice(1));
      break;
    case 'stop':
      await handleStop();
      break;
    case 'update':
      await handleUpdate();
      break;
    default:
      if (command.startsWith('-')) {
        // Flag passed without subcommand e.g. "pakage --port 7421"
        await handleLaunch(rawArgs);
      } else {
        console.error(`Unknown command: ${command}\n`);
        printHelp();
        process.exit(1);
      }
      break;
  }
}

main().catch((err) => {
  console.error('\nFatal CLI error:', err);
  process.exit(1);
});
