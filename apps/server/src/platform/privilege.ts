import { platform } from './platform.js';
import { PrivilegedResult } from './base-platform.js';

export class PrivilegeManager {
  public async runElevated(
    jobId: string,
    executable: string,
    args: string[],
    onProgress?: (msg: string) => void
  ): Promise<PrivilegedResult> {
    return platform.runElevated(jobId, executable, args, onProgress);
  }
}

export const privilegeManager = new PrivilegeManager();
