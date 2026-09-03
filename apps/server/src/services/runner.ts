import {
  OperationAction,
  OperationLog,
  OperationStatus,
  PackageManagerType,
  CommandStreamEvent,
} from '@stuff-manager/shared';
import { safeExec, validatePackageName } from '../utils/exec.js';
import { terminalRunner } from '../platform/macos-terminal.js';
import { providerRegistry } from '../providers/registry.js';
import { dbService } from '../database/db.js';
import type { WebSocket } from 'ws';

export interface RunOperationOptions {
  manager: PackageManagerType;
  action: OperationAction;
  packageName: string;
  isCask?: boolean;
  global?: boolean;
  forceTerminalPrivilege?: boolean;
  allowBreakSystemPackages?: boolean;
}

export class RunnerService {
  private activeJobs = new Map<string, OperationLog>();
  private wsClients = new Set<WebSocket>();

  public registerClient(ws: WebSocket): void {
    this.wsClients.add(ws);
    ws.on('close', () => this.wsClients.delete(ws));
  }

  private broadcast(event: CommandStreamEvent): void {
    const payload = JSON.stringify(event);
    for (const ws of this.wsClients) {
      if (ws.readyState === 1) {
        // OPEN
        ws.send(payload);
      }
    }
  }

  public async execute(opts: RunOperationOptions): Promise<OperationLog> {
    const { manager, action, packageName, isCask, forceTerminalPrivilege, allowBreakSystemPackages } = opts;

    if (!validatePackageName(packageName)) {
      throw new Error(`Invalid package name: "${packageName}"`);
    }

    const provider = providerRegistry.get(manager);
    if (!provider) {
      throw new Error(`Unsupported package manager: ${manager}`);
    }

    // Get command plan
    let plan;
    const planOpts = { isCask, allowBreakSystemPackages };
    if (action === 'install') plan = await provider.planInstall(packageName, planOpts);
    else if (action === 'uninstall') plan = await provider.planUninstall(packageName, planOpts);
    else if (action === 'update') plan = await provider.planUpdate(packageName, planOpts);
    else if (action === 'reinstall') {
      if (!provider.planReinstall) throw new Error(`Reinstall not supported for ${manager}`);
      plan = await provider.planReinstall(packageName, planOpts);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullCommandStr = `${plan.executable} ${plan.args.join(' ')}`;
    const requiresPrivilege = Boolean(forceTerminalPrivilege || plan.requiresPrivilege);

    const logEntry: OperationLog = {
      id: jobId,
      manager,
      action,
      packageName,
      command: fullCommandStr,
      status: 'running',
      requiresPrivilege,
      startTime: new Date().toISOString(),
      output: `$ ${fullCommandStr}\n\n`,
    };

    this.activeJobs.set(jobId, logEntry);
    dbService.saveOperation(logEntry);

    this.broadcast({
      jobId,
      type: 'status',
      data: `Started ${action} of ${packageName}`,
      status: 'running',
      timestamp: new Date().toISOString(),
    });

    this.broadcast({
      jobId,
      type: 'stdout',
      data: `$ ${fullCommandStr}\n\n`,
      timestamp: new Date().toISOString(),
    });

    // Run asynchronously so caller gets job ID and initial log entry immediately
    (async () => {
      try {
        if (requiresPrivilege) {
          const result = await terminalRunner.runInTerminal(
            jobId,
            plan.executable,
            plan.args,
            true,
            (msg) => {
              logEntry.output += `[Terminal] ${msg}\n`;
              this.broadcast({
                jobId,
                type: 'stdout',
                data: `[Terminal] ${msg}\n`,
                timestamp: new Date().toISOString(),
              });
            }
          );

          logEntry.output += result.output;
          logEntry.exitCode = result.exitCode;
          logEntry.status = result.success ? 'success' : 'failed';
          logEntry.endTime = new Date().toISOString();
        } else {
          const result = await safeExec(plan.executable, plan.args, {
            onStdout: (chunk) => {
              logEntry.output += chunk;
              this.broadcast({
                jobId,
                type: 'stdout',
                data: chunk,
                timestamp: new Date().toISOString(),
              });
            },
            onStderr: (chunk) => {
              logEntry.output += chunk;
              this.broadcast({
                jobId,
                type: 'stderr',
                data: chunk,
                timestamp: new Date().toISOString(),
              });
            },
          });

          logEntry.exitCode = result.exitCode;
          logEntry.status = result.exitCode === 0 ? 'success' : 'failed';
          logEntry.endTime = new Date().toISOString();
        }
      } catch (err: any) {
        logEntry.status = 'failed';
        logEntry.error = err.message;
        logEntry.output += `\nError: ${err.message}\n`;
        logEntry.endTime = new Date().toISOString();
      } finally {
        providerRegistry.invalidateAllCaches();
        dbService.saveOperation(logEntry);

        this.broadcast({
          jobId,
          type: 'exit',
          data: logEntry.status === 'success' ? '✓ Operation completed successfully.' : `✗ Operation failed (Exit code: ${logEntry.exitCode})`,
          status: logEntry.status,
          exitCode: logEntry.exitCode,
          timestamp: new Date().toISOString(),
        });
      }
    })();

    return logEntry;
  }

  public getJob(jobId: string): OperationLog | null {
    return this.activeJobs.get(jobId) || dbService.getOperation(jobId);
  }

  public getRecentJobs(limit = 30): OperationLog[] {
    return dbService.getHistory(limit);
  }

  public destroyAll(): void {
    for (const ws of this.wsClients) {
      try {
        ws.close();
      } catch (_) {}
    }
    this.wsClients.clear();
    this.activeJobs.clear();
  }
}

export const runnerService = new RunnerService();
