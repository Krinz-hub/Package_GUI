import { DoctorAction, OperationLog } from '@stuff-manager/shared';
import { platform } from '../platform/platform.js';
import { runnerService } from './runner.js';
import { pipProvider } from '../providers/pip.js';
import { safeExec } from '../utils/exec.js';

export class ActionRunner {
  public async executeAction(action: DoctorAction): Promise<{ success: boolean; message: string; job?: OperationLog }> {
    if (!action || !action.type) {
      throw new Error('Invalid action payload');
    }

    // 0. Create Python Virtual Environment (.venv)
    if (action.type === 'create-venv') {
      const result = await pipProvider.createVirtualEnvironment();
      return {
        success: result.success,
        message: result.message,
      };
    }

    // 1. Launch native Application
    if (action.type === 'launch-app') {
      const appTarget = action.application || 'Docker';
      const result = await platform.launchApplication(appTarget);
      return {
        success: result.success,
        message: result.message || `Launched ${appTarget}`,
      };
    }

    // 2. Install Package
    if (action.type === 'install-package') {
      if (!action.manager || !action.packageName) {
        throw new Error('Missing package manager or package name');
      }
      const job = await runnerService.execute({
        manager: action.manager,
        action: 'install',
        packageName: action.packageName,
        forceTerminalPrivilege: Boolean(action.requiresTerminal),
      });
      return {
        success: true,
        message: `Started installation of ${action.packageName}`,
        job,
      };
    }

    // 3. Allowlisted Command Action
    if (action.type === 'command') {
      const allowlist: Record<string, { executable: string; args: string[]; requiresPrivilege?: boolean }> = {
        'install-rust': {
          executable: 'curl',
          args: ['--proto', '=https', '--tlsv1.2', '-sSf', 'https://sh.rustup.rs', '|', 'sh', '-s', '--', '-y'],
        },
        'install-homebrew': {
          executable: '/bin/bash',
          args: ['-c', '$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)'],
          requiresPrivilege: true,
        },
        'brew-update': {
          executable: 'brew',
          args: ['update'],
        },
        'upgrade-pip': {
          executable: 'python3',
          args: ['-m', 'pip', 'install', '--upgrade', 'pip'],
        },
      };

      const plan = allowlist[action.id];
      if (!plan) {
        throw new Error(`Action "${action.id}" is not in the allowed actions registry.`);
      }

      // If action specifies a package manager command, delegate to runnerService
      if (action.manager && action.packageName) {
        const job = await runnerService.execute({
          manager: action.manager,
          action: 'install',
          packageName: action.packageName,
          forceTerminalPrivilege: Boolean(action.requiresTerminal || plan.requiresPrivilege),
        });
        return { success: true, message: `Running ${action.label}`, job };
      }

      // Execute safe command
      const res = await safeExec(plan.executable, plan.args);
      return {
        success: res.exitCode === 0,
        message: res.exitCode === 0 ? `Successfully executed ${action.label}` : res.stderr || 'Command failed',
      };
    }

    throw new Error(`Unsupported action type: ${(action as any).type}`);
  }
}

export const actionRunner = new ActionRunner();
