import { OperatingSystemInfo, PortInfo, PlatformType } from '@stuff-manager/shared';

export interface PrivilegedResult {
  success: boolean;
  exitCode: number;
  output: string;
}

export interface BasePlatform {
  readonly type: PlatformType;
  getOSInfo(): Promise<OperatingSystemInfo>;
  getDefaultShell(): { shell: string; shellPath: string };
  scanPorts(): Promise<PortInfo[]>;
  launchApplication(appPathOrName: string): Promise<{ success: boolean; message?: string }>;
  runElevated(
    jobId: string,
    executable: string,
    args: string[],
    onProgress?: (msg: string) => void
  ): Promise<PrivilegedResult>;
}
