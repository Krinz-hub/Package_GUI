import { DoctorCheck } from '@stuff-manager/shared';
import { safeExec } from '../utils/exec.js';
import os from 'os';
import fs from 'fs';

export class DoctorService {
  public async runDiagnostics(): Promise<DoctorCheck[]> {
    const checks: DoctorCheck[] = [];

    // 1. macOS System check
    checks.push({
      id: 'system:macos',
      name: 'macOS Platform',
      category: 'system',
      status: 'healthy',
      version: `${os.type()} ${os.release()} (${os.arch()})`,
      message: `Running macOS on Apple Silicon / Darwin (${os.hostname()})`,
    });

    // 2. Homebrew check
    const brewRes = await safeExec('brew', ['--version']);
    if (brewRes.exitCode === 0) {
      const match = brewRes.stdout.match(/Homebrew\s+([\d\.]+)/i);
      const prefixRes = await safeExec('brew', ['--prefix']);
      const prefix = prefixRes.exitCode === 0 ? prefixRes.stdout.trim() : '/opt/homebrew';

      checks.push({
        id: 'pkg:homebrew',
        name: 'Homebrew',
        category: 'package_manager',
        status: 'healthy',
        version: match ? match[1] : 'installed',
        path: prefix,
        message: `Homebrew is installed and operational at ${prefix}`,
      });
    } else {
      checks.push({
        id: 'pkg:homebrew',
        name: 'Homebrew',
        category: 'package_manager',
        status: 'not_installed',
        message: 'Homebrew is not detected in PATH',
        suggestion: 'Install Homebrew using /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
      });
    }

    // 3. Git check
    const gitRes = await safeExec('git', ['--version']);
    if (gitRes.exitCode === 0) {
      const match = gitRes.stdout.match(/git\s+version\s+([\d\.]+)/i);
      const whichRes = await safeExec('which', ['git']);
      checks.push({
        id: 'vcs:git',
        name: 'Git Version Control',
        category: 'vcs',
        status: 'healthy',
        version: match ? match[1] : gitRes.stdout.trim(),
        path: whichRes.stdout.trim(),
        message: 'Git is configured and available for version control',
      });
    } else {
      checks.push({
        id: 'vcs:git',
        name: 'Git Version Control',
        category: 'vcs',
        status: 'error',
        message: 'Git executable not found in PATH',
        suggestion: 'Install Xcode Command Line Tools: xcode-select --install or brew install git',
      });
    }

    // 4. Node.js check
    const nodeRes = await safeExec('node', ['-v']);
    if (nodeRes.exitCode === 0) {
      const whichRes = await safeExec('which', ['node']);
      checks.push({
        id: 'runtime:node',
        name: 'Node.js Runtime',
        category: 'runtime',
        status: 'healthy',
        version: nodeRes.stdout.trim(),
        path: whichRes.stdout.trim(),
        message: `Node.js runtime active (${nodeRes.stdout.trim()})`,
      });
    } else {
      checks.push({
        id: 'runtime:node',
        name: 'Node.js Runtime',
        category: 'runtime',
        status: 'error',
        message: 'Node.js runtime not found',
        suggestion: 'Install Node.js via Homebrew: brew install node',
      });
    }

    // 5. npm check
    const npmRes = await safeExec('npm', ['-v']);
    if (npmRes.exitCode === 0) {
      const whichRes = await safeExec('which', ['npm']);
      checks.push({
        id: 'pkg:npm',
        name: 'npm Package Manager',
        category: 'package_manager',
        status: 'healthy',
        version: npmRes.stdout.trim(),
        path: whichRes.stdout.trim(),
        message: `npm is ready for managing global and local Node packages`,
      });
    } else {
      checks.push({
        id: 'pkg:npm',
        name: 'npm Package Manager',
        category: 'package_manager',
        status: 'warning',
        message: 'npm not found in PATH',
        suggestion: 'Install Node.js to get npm: brew install node',
      });
    }

    // 6. Python 3 & pip check
    const pyRes = await safeExec('python3', ['--version']);
    if (pyRes.exitCode === 0) {
      const match = pyRes.stdout.match(/Python\s+([\d\.]+)/i);
      const whichRes = await safeExec('which', ['python3']);
      checks.push({
        id: 'runtime:python3',
        name: 'Python 3',
        category: 'runtime',
        status: 'healthy',
        version: match ? match[1] : pyRes.stdout.trim(),
        path: whichRes.stdout.trim(),
        message: 'Python 3 is available',
      });
    } else {
      checks.push({
        id: 'runtime:python3',
        name: 'Python 3',
        category: 'runtime',
        status: 'warning',
        message: 'Python 3 not found',
        suggestion: 'Install Python via Homebrew: brew install python',
      });
    }

    // 7. Docker check
    const dockerRes = await safeExec('docker', ['--version']);
    if (dockerRes.exitCode === 0) {
      const daemonRes = await safeExec('docker', ['info'], { timeoutMs: 3000 });
      const isDaemonUp = daemonRes.exitCode === 0;

      checks.push({
        id: 'container:docker',
        name: 'Docker Desktop / Daemon',
        category: 'container',
        status: isDaemonUp ? 'healthy' : 'warning',
        version: dockerRes.stdout.trim(),
        message: isDaemonUp
          ? 'Docker CLI and Docker Daemon are active and running'
          : 'Docker CLI is installed, but Docker Desktop daemon is not currently running',
        suggestion: isDaemonUp ? undefined : 'Launch Docker Desktop from /Applications/Docker.app',
      });
    } else {
      checks.push({
        id: 'container:docker',
        name: 'Docker Desktop / Daemon',
        category: 'container',
        status: 'not_installed',
        message: 'Docker is not installed',
        suggestion: 'Install Docker Desktop: brew install --cask docker',
      });
    }

    // 8. Android ADB check
    const adbCandidates = [
      `${os.homedir()}/Library/Android/sdk/platform-tools/adb`,
      '/opt/homebrew/bin/adb',
      '/usr/local/bin/adb',
    ];
    let foundAdbPath: string | null = null;
    for (const p of adbCandidates) {
      if (fs.existsSync(p)) {
        foundAdbPath = p;
        break;
      }
    }
    if (!foundAdbPath) {
      const whichAdb = await safeExec('which', ['adb']);
      if (whichAdb.exitCode === 0) foundAdbPath = whichAdb.stdout.trim();
    }

    if (foundAdbPath) {
      const adbVerRes = await safeExec(foundAdbPath, ['version']);
      const match = adbVerRes.stdout.match(/Version\s+([\d\.\-]+)/i);
      checks.push({
        id: 'mobile:adb',
        name: 'Android ADB & SDK',
        category: 'mobile',
        status: 'healthy',
        version: match ? match[1] : 'installed',
        path: foundAdbPath,
        message: `Android Debug Bridge is ready at ${foundAdbPath}`,
      });
    } else {
      checks.push({
        id: 'mobile:adb',
        name: 'Android ADB & SDK',
        category: 'mobile',
        status: 'not_installed',
        message: 'Android SDK platform-tools / adb not found',
        suggestion: 'Install Android Command Line Tools or Android Studio: brew install --cask android-platform-tools',
      });
    }

    // 9. Cargo / Rust check
    const cargoRes = await safeExec('cargo', ['--version']);
    if (cargoRes.exitCode === 0) {
      checks.push({
        id: 'pkg:cargo',
        name: 'Cargo (Rust)',
        category: 'package_manager',
        status: 'healthy',
        version: cargoRes.stdout.trim(),
        message: 'Cargo and Rust toolchain are ready',
      });
    } else {
      checks.push({
        id: 'pkg:cargo',
        name: 'Cargo (Rust)',
        category: 'package_manager',
        status: 'not_installed',
        message: 'Rust / Cargo toolchain is not installed',
        suggestion: 'Install Rust via rustup: curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
      });
    }

    return checks;
  }
}

export const doctorService = new DoctorService();
