export type PackageManagerType =
  | 'brew'
  | 'npm'
  | 'pip'
  | 'cargo'
  | 'docker'
  | 'android'
  | 'winget'
  | 'chocolatey'
  | 'scoop'
  | 'apt'
  | 'dnf'
  | 'pacman';

export type PackageKind =
  | 'formula'
  | 'cask'
  | 'global-pkg'
  | 'pip-pkg'
  | 'cargo-bin'
  | 'container'
  | 'sdk-pkg'
  | 'system-pkg'
  | 'app-pkg';

export interface Package {
  id: string; // e.g. 'brew:node', 'npm:n8n', 'winget:Microsoft.PowerToys'
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
  activeProcesses?: { pid: number; name: string; port?: number }[];
}

export type PlatformType = 'darwin' | 'win32' | 'linux';

export interface OperatingSystemInfo {
  platform: PlatformType;
  displayName: string; // e.g. 'macOS 15.2 (Apple Silicon)', 'Windows 11 (x64)', 'Ubuntu 24.04 (x64)'
  distro?: string; // e.g. 'Ubuntu', 'Fedora', 'Arch Linux', 'macOS'
  release: string;
  arch: string;
  kernel: string;
  hostname: string;
  uptime: number;
  shell: string; // e.g. 'zsh', 'bash', 'PowerShell'
  shellPath: string;
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

export interface PythonEnvironmentInfo {
  name: string; // e.g. '.venv', 'Homebrew Python', 'System Python'
  type: 'venv' | 'homebrew' | 'system' | 'conda' | 'other';
  path: string;
  pythonPath: string;
  pipPath?: string;
  version?: string;
  isExternallyManaged: boolean;
  externallyManagedReason?: string;
  active: boolean;
}

export type DoctorStatus = 'healthy' | 'warning' | 'error' | 'not_installed';

export type DoctorActionType = 'launch-app' | 'command' | 'install-package' | 'create-venv';

export interface DoctorAction {
  id: string;
  label: string;
  type: DoctorActionType;
  application?: string;
  command?: string;
  manager?: PackageManagerType;
  packageName?: string;
  isPrivileged?: boolean;
  requiresTerminal?: boolean;
}

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
  action?: DoctorAction;
}

export interface PortInfo {
  port: number;
  protocol: 'TCP' | 'UDP';
  address: string;
  status: string; // 'LISTENING', 'ESTABLISHED', etc.
  pid: number;
  processName: string;
  command: string;
  packageName?: string;
  packageManager?: PackageManagerType;
  packageId?: string;
  user?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  ports: number[];
  cpu?: string;
  memory?: string;
  user: string;
  status: 'running' | 'sleeping' | 'stopped';
  executablePath?: string;
  packageName?: string;
  packageManager?: PackageManagerType;
}

export interface ServiceInfo {
  id: string;
  name: string;
  displayName: string;
  status: 'running' | 'stopped' | 'not_installed' | 'unknown';
  port?: number;
  pid?: number;
  manager?: string;
  description?: string;
  startup?: string;
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

export interface TerminalWSMessage {
  type: 'input' | 'resize' | 'output' | 'status';
  data?: string;
  cols?: number;
  rows?: number;
  status?: 'connected' | 'closed';
}

export interface SystemOverview {
  os: OperatingSystemInfo;
  totalPackages: number;
  totalUpdates: number;
  totalPorts?: number;
  managers: PackageManagerInfo[];
  doctorIssuesCount: number;
  runningProcessesCount: number;
}
