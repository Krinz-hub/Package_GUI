import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  Package,
  PackageManagerInfo,
  PackageManagerType,
  PythonEnvironmentInfo,
} from '@stuff-manager/shared';
import { PackageManagerProvider, CommandPlan, CommandPlanOptions } from './base.js';
import { safeExec, validatePackageName } from '../utils/exec.js';

export class PipProvider implements PackageManagerProvider {
  readonly id: PackageManagerType = 'pip';
  readonly name = 'pip';
  readonly displayName = 'Python (pip)';
  readonly description = 'Environment-aware package installer for Python virtualenvs & libraries';

  private cachedPackages: Package[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 15000;

  /**
   * Discovers all available Python environments on the host machine.
   * Priority:
   * 1. Project Virtual Environment (.venv, venv, env, virtualenv)
   * 2. Homebrew Python (macOS/Linux)
   * 3. System / Standard Python
   */
  public async getEnvironments(): Promise<PythonEnvironmentInfo[]> {
    const envs: PythonEnvironmentInfo[] = [];
    const isWindows = process.platform === 'win32';

    // 1. Check project virtual environments in cwd
    const cwd = process.cwd();
    const venvNames = ['.venv', 'venv', 'env', 'virtualenv'];
    let foundVenv = false;

    for (const vName of venvNames) {
      const vPath = path.join(cwd, vName);
      const pyBin = isWindows
        ? path.join(vPath, 'Scripts', 'python.exe')
        : path.join(vPath, 'bin', 'python');
      const pyBin3 = isWindows
        ? path.join(vPath, 'Scripts', 'python3.exe')
        : path.join(vPath, 'bin', 'python3');

      const activePy = fs.existsSync(pyBin) ? pyBin : fs.existsSync(pyBin3) ? pyBin3 : null;

      if (activePy) {
        foundVenv = true;
        let venvVersion = '';
        const verRes = await safeExec(activePy, ['--version']);
        if (verRes.exitCode === 0) {
          venvVersion = verRes.stdout.trim().replace(/^Python\s+/i, '');
        }

        envs.push({
          name: vName,
          type: 'venv',
          path: vPath,
          pythonPath: activePy,
          pipPath: `${activePy} -m pip`,
          version: venvVersion || '3.x',
          isExternallyManaged: false,
          active: true,
        });
        break; // Use highest priority project venv
      }
    }

    // 2. Discover Homebrew Python
    let homebrewPyPath: string | null = null;
    if (os.platform() === 'darwin' || os.platform() === 'linux') {
      const brewPrefixRes = await safeExec('brew', ['--prefix']);
      const brewPrefix = brewPrefixRes.exitCode === 0 ? brewPrefixRes.stdout.trim() : '/opt/homebrew';

      const brewCandidates = [
        path.join(brewPrefix, 'bin', 'python3'),
        '/opt/homebrew/bin/python3',
        '/usr/local/bin/python3',
      ];

      for (const p of brewCandidates) {
        if (fs.existsSync(p)) {
          homebrewPyPath = p;
          break;
        }
      }
    }

    if (homebrewPyPath) {
      const isManaged = await this.checkIsExternallyManaged(homebrewPyPath);
      let hbVer = '';
      const verRes = await safeExec(homebrewPyPath, ['--version']);
      if (verRes.exitCode === 0) {
        hbVer = verRes.stdout.trim().replace(/^Python\s+/i, '');
      }

      envs.push({
        name: 'Homebrew Python',
        type: 'homebrew',
        path: path.dirname(homebrewPyPath),
        pythonPath: homebrewPyPath,
        pipPath: `${homebrewPyPath} -m pip`,
        version: hbVer || '3.x',
        isExternallyManaged: isManaged,
        externallyManagedReason: isManaged ? 'PEP 668 / Homebrew externally-managed environment' : undefined,
        active: !foundVenv,
      });
    }

    // 3. Discover System / Standard Python
    const whichPy = await safeExec('which', ['python3']);
    const sysPyCandidate = whichPy.exitCode === 0 ? whichPy.stdout.trim() : '/usr/bin/python3';

    if (fs.existsSync(sysPyCandidate) && (!homebrewPyPath || path.resolve(sysPyCandidate) !== path.resolve(homebrewPyPath))) {
      const isManaged = await this.checkIsExternallyManaged(sysPyCandidate);
      let sysVer = '';
      const verRes = await safeExec(sysPyCandidate, ['--version']);
      if (verRes.exitCode === 0) {
        sysVer = verRes.stdout.trim().replace(/^Python\s+/i, '');
      }

      envs.push({
        name: 'System Python',
        type: 'system',
        path: path.dirname(sysPyCandidate),
        pythonPath: sysPyCandidate,
        pipPath: `${sysPyCandidate} -m pip`,
        version: sysVer || '3.x',
        isExternallyManaged: isManaged,
        externallyManagedReason: isManaged ? 'PEP 668 / OS externally-managed environment' : undefined,
        active: !foundVenv && !homebrewPyPath,
      });
    }

    return envs;
  }

  /**
   * Resolves the active Python environment (virtual environment if found, otherwise base interpreter).
   */
  public async getActiveEnvironment(): Promise<PythonEnvironmentInfo> {
    const envs = await this.getEnvironments();
    const active = envs.find((e) => e.active) || envs[0];
    if (active) return active;

    const defaultPy = process.platform === 'win32' ? 'python.exe' : 'python3';
    return {
      name: 'Default Python',
      type: 'system',
      path: process.cwd(),
      pythonPath: defaultPy,
      pipPath: `${defaultPy} -m pip`,
      version: '3.x',
      isExternallyManaged: false,
      active: true,
    };
  }

  /**
   * Determines whether a Python interpreter enforces PEP 668 EXTERNALLY-MANAGED.
   */
  public async checkIsExternallyManaged(pythonExecutable: string): Promise<boolean> {
    try {
      // 1. Ask Python stdlib directly for EXTERNALLY-MANAGED marker
      const script = `import sysconfig, os, sys
stdlib = sysconfig.get_path('stdlib') or ''
platstdlib = sysconfig.get_path('platstdlib') or ''
candidates = [stdlib, platstdlib, os.path.dirname(stdlib)]
has_marker = any(os.path.exists(os.path.join(p, 'EXTERNALLY-MANAGED')) for p in candidates if p)
print('YES' if has_marker else 'NO')`;

      const res = await safeExec(pythonExecutable, ['-c', script], { timeoutMs: 5000 });
      if (res.exitCode === 0 && res.stdout.includes('YES')) {
        return true;
      }

      // 2. Dry-run test with pip
      const dryRunRes = await safeExec(pythonExecutable, ['-m', 'pip', 'install', '--dry-run', 'pip'], { timeoutMs: 6000 });
      if (
        dryRunRes.stderr.includes('externally-managed-environment') ||
        dryRunRes.stdout.includes('externally-managed-environment') ||
        dryRunRes.stderr.includes('PEP 668')
      ) {
        return true;
      }
    } catch (_) {}

    return false;
  }

  /**
   * Creates a project virtual environment in target directory (e.g. .venv).
   */
  public async createVirtualEnvironment(targetDir: string = process.cwd(), envName: string = '.venv'): Promise<{
    success: boolean;
    message: string;
    envPath: string;
    pythonPath: string;
  }> {
    const envPath = path.join(targetDir, envName);
    const isWindows = process.platform === 'win32';

    // Find base Python interpreter to create the venv
    const envs = await this.getEnvironments();
    const baseEnv = envs.find((e) => e.type === 'homebrew' || e.type === 'system') || envs[0];
    const basePy = baseEnv ? baseEnv.pythonPath : (isWindows ? 'python' : 'python3');

    // Execute python3 -m venv .venv
    const venvRes = await safeExec(basePy, ['-m', 'venv', envPath], { timeoutMs: 60000 });
    if (venvRes.exitCode !== 0) {
      throw new Error(`Failed to create virtual environment with ${basePy}: ${venvRes.stderr || venvRes.stdout}`);
    }

    const newPyPath = isWindows
      ? path.join(envPath, 'Scripts', 'python.exe')
      : path.join(envPath, 'bin', 'python');

    if (!fs.existsSync(newPyPath)) {
      throw new Error(`Virtual environment created at ${envPath}, but Python interpreter was not found at ${newPyPath}`);
    }

    // Verify pip inside the virtual environment
    await safeExec(newPyPath, ['-m', 'pip', '--version'], { timeoutMs: 15000 });

    this.invalidateCache();

    return {
      success: true,
      message: `Virtual environment created successfully at ${envPath}`,
      envPath,
      pythonPath: newPyPath,
    };
  }

  public async detect(): Promise<PackageManagerInfo> {
    const activeEnv = await this.getActiveEnvironment();
    let version = '';

    const verRes = await safeExec(activeEnv.pythonPath, ['-m', 'pip', '--version']);
    if (verRes.exitCode === 0) {
      const match = verRes.stdout.match(/pip\s+([\d\.]+)/i);
      version = match ? match[1] : verRes.stdout.split(' ')[1] || 'installed';
    }

    let packageCount = 0;
    let updatesCount = 0;
    try {
      const pkgs = await this.list();
      packageCount = pkgs.length;
      updatesCount = pkgs.filter((p) => p.updateAvailable).length;
    } catch (_) {}

    const isInstalled = Boolean(version || fs.existsSync(activeEnv.pythonPath));

    return {
      id: this.id,
      name: this.name,
      displayName: activeEnv.type === 'venv' ? `Python (venv: ${activeEnv.name})` : `Python (${activeEnv.name})`,
      installed: isInstalled,
      version: version ? `pip ${version} (Python ${activeEnv.version})` : activeEnv.version,
      executablePath: activeEnv.pythonPath,
      packageCount,
      updatesCount,
      description: activeEnv.isExternallyManaged
        ? `${activeEnv.name} is externally managed (PEP 668). Virtual environments recommended.`
        : `Active environment: ${activeEnv.name} (${activeEnv.path})`,
    };
  }

  public async list(): Promise<Package[]> {
    const now = Date.now();
    if (this.cachedPackages && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedPackages;
    }

    const activeEnv = await this.getActiveEnvironment();
    if (!fs.existsSync(activeEnv.pythonPath) && !activeEnv.pythonPath.includes('python')) {
      return [];
    }

    const [listRes, outdatedRes] = await Promise.all([
      safeExec(activeEnv.pythonPath, ['-m', 'pip', 'list', '--format=json'], { timeoutMs: 15000 }),
      safeExec(activeEnv.pythonPath, ['-m', 'pip', 'list', '--outdated', '--format=json'], { timeoutMs: 15000 }),
    ]);

    const outdatedMap = new Map<string, string>(); // name -> latest_version
    if (outdatedRes.stdout.trim()) {
      try {
        const outJson = JSON.parse(outdatedRes.stdout.trim());
        if (Array.isArray(outJson)) {
          for (const item of outJson) {
            if (item.name && item.latest_version) {
              outdatedMap.set(item.name.toLowerCase(), item.latest_version);
            }
          }
        }
      } catch (_) {}
    }

    const packages: Package[] = [];

    if (listRes.stdout.trim()) {
      try {
        const listJson = JSON.parse(listRes.stdout.trim());
        if (Array.isArray(listJson)) {
          for (const item of listJson) {
            const name = item.name;
            const version = item.version || 'unknown';
            const latest = outdatedMap.get(name.toLowerCase());
            const updateAvailable = Boolean(latest && latest !== version);

            packages.push({
              id: `pip:${name}`,
              name,
              displayName: name,
              version,
              latestVersion: updateAvailable ? latest : undefined,
              manager: 'pip',
              type: 'pip-pkg',
              location: activeEnv.type === 'venv' ? `${activeEnv.name} site-packages` : `${activeEnv.name} site-packages`,
              installed: true,
              updateAvailable,
              installCommand: activeEnv.type === 'venv' ? `${activeEnv.name}/bin/python -m pip install ${name}` : `python3 -m pip install ${name}`,
            });
          }
        }
      } catch (e) {
        console.error('Error parsing pip list json:', e);
      }
    }

    this.cachedPackages = packages;
    this.lastFetchTime = Date.now();
    return packages;
  }

  public async info(nameOrId: string): Promise<Package | null> {
    const rawName = nameOrId.replace(/^pip:/, '');
    if (!validatePackageName(rawName)) return null;

    const list = await this.list();
    const existing = list.find((p) => p.id === nameOrId || p.name.toLowerCase() === rawName.toLowerCase());

    const activeEnv = await this.getActiveEnvironment();
    const res = await safeExec(activeEnv.pythonPath, ['-m', 'pip', 'show', rawName], { timeoutMs: 10000 });
    if (res.exitCode === 0 && res.stdout.trim()) {
      const lines = res.stdout.split('\n');
      const details: Record<string, string> = {};
      for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          details[key] = val;
        }
      }

      return {
        id: `pip:${rawName}`,
        name: details['Name'] || rawName,
        displayName: details['Name'] || rawName,
        version: details['Version'] || (existing ? existing.version : 'unknown'),
        manager: 'pip',
        type: 'pip-pkg',
        location: details['Location'] || (existing ? existing.location : ''),
        description: details['Summary'] || '',
        homepage: details['Home-page'] || '',
        license: details['License'] || '',
        installed: true,
        updateAvailable: existing ? existing.updateAvailable : false,
        dependencies: details['Requires'] ? details['Requires'].split(',').map((s) => s.trim()).filter(Boolean) : [],
        installCommand: `python3 -m pip install ${rawName}`,
      };
    }

    return existing || null;
  }

  public async planInstall(name: string, options?: CommandPlanOptions): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const activeEnv = await this.getActiveEnvironment();

    // Check PEP 668 externally managed restriction
    if (activeEnv.isExternallyManaged && !options?.allowBreakSystemPackages) {
      const err: any = new Error(
        `This Python environment (${activeEnv.name}) is externally managed (PEP 668). System-wide pip installations are restricted to protect Homebrew/OS Python stability. Please create or use a virtual environment (.venv) or use pipx.`
      );
      err.code = 'PYTHON_EXTERNALLY_MANAGED';
      err.interpreter = activeEnv.pythonPath;
      err.environment = activeEnv.name;
      throw err;
    }

    const args = ['-m', 'pip', 'install', name];
    if (options?.allowBreakSystemPackages) {
      args.push('--break-system-packages');
    }

    return {
      executable: activeEnv.pythonPath,
      args,
      requiresPrivilege: false,
    };
  }

  public async planUninstall(name: string): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const activeEnv = await this.getActiveEnvironment();
    return {
      executable: activeEnv.pythonPath,
      args: ['-m', 'pip', 'uninstall', '-y', name],
      requiresPrivilege: false,
    };
  }

  public async planUpdate(name: string, options?: CommandPlanOptions): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const activeEnv = await this.getActiveEnvironment();

    if (activeEnv.isExternallyManaged && !options?.allowBreakSystemPackages) {
      const err: any = new Error(
        `This Python environment (${activeEnv.name}) is externally managed (PEP 668). Cannot upgrade package globally without a virtual environment.`
      );
      err.code = 'PYTHON_EXTERNALLY_MANAGED';
      err.interpreter = activeEnv.pythonPath;
      throw err;
    }

    const args = ['-m', 'pip', 'install', '--upgrade', name];
    if (options?.allowBreakSystemPackages) {
      args.push('--break-system-packages');
    }

    return {
      executable: activeEnv.pythonPath,
      args,
      requiresPrivilege: false,
    };
  }

  public async planReinstall(name: string, options?: CommandPlanOptions): Promise<CommandPlan> {
    if (!validatePackageName(name)) throw new Error('Invalid package name');
    const activeEnv = await this.getActiveEnvironment();

    if (activeEnv.isExternallyManaged && !options?.allowBreakSystemPackages) {
      const err: any = new Error(
        `This Python environment (${activeEnv.name}) is externally managed (PEP 668). Cannot reinstall package globally without a virtual environment.`
      );
      err.code = 'PYTHON_EXTERNALLY_MANAGED';
      err.interpreter = activeEnv.pythonPath;
      throw err;
    }

    const args = ['-m', 'pip', 'install', '--force-reinstall', name];
    if (options?.allowBreakSystemPackages) {
      args.push('--break-system-packages');
    }

    return {
      executable: activeEnv.pythonPath,
      args,
      requiresPrivilege: false,
    };
  }

  public invalidateCache(): void {
    this.cachedPackages = null;
    this.lastFetchTime = 0;
  }
}

export const pipProvider = new PipProvider();
