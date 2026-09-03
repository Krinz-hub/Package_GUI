export type PackageManagerType = 'brew' | 'npm' | 'pip' | 'cargo' | 'docker' | 'android';

export type PackageKind =
  | 'formula'
  | 'cask'
  | 'global-pkg'
  | 'pip-pkg'
  | 'cargo-bin'
  | 'container'
  | 'sdk-pkg';

export interface Package {
  id: string; // e.g. 'brew:node', 'npm:n8n', 'brew:cask:docker'
  name: string;
  displayName: string;
  version: string;
  latestVersion?: string;
  manager: PackageManagerType;
  type: PackageKind;
  location: string;
  description?: string;
  homepage?: string;
  license?: string;
  installed: boolean;
  updateAvailable: boolean;
  dependencies?: string[];
  caveats?: string;
  installCommand: string;
  installedAt?: string;
  size?: string;
  pinned?: boolean;
  bottle?: boolean;
  tap?: string;
}

export interface PackageManagerInfo {
  id: PackageManagerType;
  name: string;
  displayName: string;
  installed: boolean;
  version?: string;
  executablePath?: string;
  packageCount: number;
  updatesCount: number;
  description: string;
}

export type DoctorStatus = 'healthy' | 'warning' | 'error' | 'not_installed';

export interface DoctorCheck {
  id: string;
  name: string;
  category: 'package_manager' | 'runtime' | 'vcs' | 'container' | 'mobile' | 'system';
  status: DoctorStatus;
  version?: string;
  path?: string;
  message: string;
  details?: string;
  suggestion?: string;
  actionCommand?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  port?: number;
  cpu?: string;
  memory?: string;
  user: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  createdSince: string;
}

export interface DockerInfo {
  available: boolean;
  daemonRunning: boolean;
  clientVersion?: string;
  serverVersion?: string;
  containers: DockerContainer[];
  images: DockerImage[];
}

export interface AndroidDevice {
  id: string;
  model: string;
  state: string;
  product: string;
}

export interface AndroidInfo {
  available: boolean;
  adbVersion?: string;
  adbPath?: string;
  sdkPath?: string;
  devices: AndroidDevice[];
  installedPackagesCount?: number;
}

export type OperationAction = 'install' | 'uninstall' | 'update' | 'reinstall';

export type OperationStatus = 'pending' | 'running' | 'success' | 'failed';

export interface OperationLog {
  id: string;
  manager: PackageManagerType;
  action: OperationAction;
  packageName: string;
  command: string;
  status: OperationStatus;
  requiresPrivilege: boolean;
  exitCode?: number;
  startTime: string;
  endTime?: string;
  output: string;
  error?: string;
}

export interface CommandStreamEvent {
  jobId: string;
  type: 'stdout' | 'stderr' | 'status' | 'exit';
  data: string;
  status?: OperationStatus;
  exitCode?: number;
  timestamp: string;
}

export interface SystemOverview {
  os: {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
    uptime: number;
  };
  totalPackages: number;
  totalUpdates: number;
  managers: PackageManagerInfo[];
  doctorIssuesCount: number;
  runningProcessesCount: number;
}
