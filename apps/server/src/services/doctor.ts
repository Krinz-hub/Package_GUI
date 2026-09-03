import { DoctorCheck } from '@stuff-manager/shared';
import { safeExec } from '../utils/exec.js';
import { platform } from '../platform/platform.js';
import os from 'os';
import fs from 'fs';

export class DoctorService {
  public async runDiagnostics(): Promise<DoctorCheck[]> {
    const checks: DoctorCheck[] = [];
    const osInfo = await platform.getOSInfo();

    // 1. Operating System check
    checks.push({
      id: 'system:os',
      name: 'Operating System',
      category: 'system',
      status: 'healthy',
      version: osInfo.displayName,
      message: `Running ${osInfo.displayName} on ${osInfo.hostname} (Shell: ${osInfo.shell})`,
    });

    // 2. Package Manager Check (Platform-specific)
    if (os.platform() === 'darwin') {
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
          suggestion: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
          action: {
            id: 'install-homebrew',
            label: 'Install Homebrew',
            type: 'command',
            command: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
            requiresTerminal: true,
          },
        });
      }
    } else if (os.platform() === 'win32') {
      const wingetRes = await safeExec('winget', ['--version']);
      checks.push({
        id: 'pkg:winget',
        name: 'Windows Package Manager (winget)',
        category: 'package_manager',
        status: wingetRes.exitCode === 0 ? 'healthy' : 'not_installed',
        version: wingetRes.exitCode === 0 ? wingetRes.stdout.trim() : undefined,
        message: wingetRes.exitCode === 0 ? 'winget is active' : 'winget not found',
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
        path: whichRes.stdout.trim() || undefined,
        message: 'Git is configured and available for version control',
      });
    } else {
      checks.push({
        id: 'vcs:git',
        name: 'Git Version Control',
        category: 'vcs',
        status: 'error',
        message: 'Git executable not found in PATH',
        suggestion: 'brew install git',
        action: {
          id: 'install-git',
          label: 'Install Git',
          type: 'install-package',
          manager: 'brew',
          packageName: 'git',
        },
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
        path: whichRes.stdout.trim() || undefined,
        message: `Node.js runtime active (${nodeRes.stdout.trim()})`,
      });
    } else {
      checks.push({
        id: 'runtime:node',
        name: 'Node.js Runtime',
        category: 'runtime',
        status: 'error',
        message: 'Node.js runtime not found in PATH',
        suggestion: 'brew install node',
        action: {
          id: 'install-node',
          label: 'Install Node.js',
          type: 'install-package',
          manager: 'brew',
          packageName: 'node',
        },
      });
    }

    // 5. npm check
    const npmRes = await safeExec('npm', ['-v']);
    if (npmRes.exitCode === 0) {
      checks.push({
        id: 'pkg:npm',
        name: 'npm Package Manager',
        category: 'package_manager',
        status: 'healthy',
        version: npmRes.stdout.trim(),
        message: 'npm is ready for managing global and local Node packages',
      });
    } else {
      checks.push({
        id: 'pkg:npm',
        name: 'npm Package Manager',
        category: 'package_manager',
        status: 'warning',
        message: 'npm not found in PATH',
      });
    }

    // 6. Python 3 & Environment Check (PEP 668 aware)
    try {
      const { pipProvider } = await import('../providers/pip.js');
      const envs = await pipProvider.getEnvironments();
      const activeEnv = await pipProvider.getActiveEnvironment();

      if (envs.length > 0) {
        if (activeEnv.type === 'venv') {
          checks.push({
            id: 'runtime:python3',
            name: 'Python Environment',
            category: 'runtime',
            status: 'healthy',
            version: activeEnv.version ? `Python ${activeEnv.version}` : undefined,
            path: activeEnv.path,
            message: `Virtual environment active (${activeEnv.name}). System-wide restrictions isolated.`,
            details: `Interpreter: ${activeEnv.pythonPath}`,
          });
        } else if (activeEnv.isExternallyManaged) {
          checks.push({
            id: 'runtime:python3',
            name: 'Python Environment',
            category: 'runtime',
            status: 'warning',
            version: activeEnv.version ? `Python ${activeEnv.version}` : undefined,
            path: activeEnv.pythonPath,
            message: `${activeEnv.name} is externally managed (PEP 668). System-wide pip installations are restricted to protect stability.`,
            suggestion: 'python3 -m venv .venv',
            action: {
              id: 'create-venv',
              label: 'Create Virtual Environment (.venv)',
              type: 'create-venv',
            },
          });
        } else {
          checks.push({
            id: 'runtime:python3',
            name: 'Python 3',
            category: 'runtime',
            status: 'healthy',
            version: activeEnv.version ? `Python ${activeEnv.version}` : undefined,
            path: activeEnv.pythonPath,
            message: `Python 3 interpreter is active at ${activeEnv.pythonPath}`,
          });
        }
      } else {
        checks.push({
          id: 'runtime:python3',
          name: 'Python 3',
          category: 'runtime',
          status: 'warning',
          message: 'Python 3 not found in PATH',
          suggestion: 'brew install python',
          action: {
            id: 'install-python',
            label: 'Install Python',
            type: 'install-package',
            manager: 'brew',
            packageName: 'python',
          },
        });
      }
    } catch (_) {
      checks.push({
        id: 'runtime:python3',
        name: 'Python 3',
        category: 'runtime',
        status: 'warning',
        message: 'Unable to query Python runtime',
      });
    }

    // 7. Docker check (Actionable [Run] button to launch Docker Desktop!)
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
          : 'Docker CLI is installed, but Docker Desktop daemon is not currently running.',
        suggestion: isDaemonUp ? undefined : 'Launch Docker Desktop from /Applications/Docker.app',
        action: isDaemonUp
          ? undefined
          : {
              id: 'launch-docker',
              label: 'Launch Docker Desktop',
              type: 'launch-app',
              application: 'Docker',
            },
      });
    } else {
      checks.push({
        id: 'container:docker',
        name: 'Docker Desktop / Daemon',
        category: 'container',
        status: 'not_installed',
        message: 'Docker is not installed',
        suggestion: 'brew install --cask docker',
        action: {
          id: 'install-docker',
          label: 'Install Docker Desktop',
          type: 'install-package',
          manager: 'brew',
          packageName: 'docker',
          requiresTerminal: true,
        },
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
        suggestion: 'brew install --cask android-platform-tools',
        action: {
          id: 'install-adb',
          label: 'Install Android Platform Tools',
          type: 'install-package',
          manager: 'brew',
          packageName: 'android-platform-tools',
        },
      });
    }

    // 9. Cargo / Rust check (Actionable [Run] button to install rustup!)
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
        suggestion: 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
        action: {
          id: 'install-rust',
          label: 'Install Rust via rustup',
          type: 'command',
          command: 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
          requiresTerminal: true,
        },
      });
    }

    return checks;
  }
}

export const doctorService = new DoctorService();
