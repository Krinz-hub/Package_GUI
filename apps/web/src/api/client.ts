import {
  Package,
  PackageManagerType,
  SystemOverview,
  DoctorCheck,
  DoctorAction,
  ProcessInfo,
  PortInfo,
  ServiceInfo,
  DockerInfo,
  AndroidInfo,
  OperationLog,
} from '@stuff-manager/shared';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.error) {
        errorMsg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
      }
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  getOverview: () => fetchJson<SystemOverview>('/overview'),

  getPackages: (manager?: PackageManagerType) =>
    fetchJson<{ packages: Package[]; total: number }>(
      manager ? `/packages?manager=${manager}` : '/packages'
    ),

  getPackage: (id: string) => fetchJson<Package>(`/packages/${encodeURIComponent(id)}`),

  searchPackages: (query: string, manager?: PackageManagerType) =>
    fetchJson<{ results: Package[] }>(
      `/packages/search?q=${encodeURIComponent(query)}${manager ? `&manager=${manager}` : ''}`
    ),

  installPackage: (payload: {
    manager: PackageManagerType;
    name: string;
    isCask?: boolean;
    global?: boolean;
    forceTerminalPrivilege?: boolean;
  }) =>
    fetchJson<{ success: boolean; job: OperationLog }>('/packages/install', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uninstallPackage: (payload: {
    manager: PackageManagerType;
    name: string;
    isCask?: boolean;
    forceTerminalPrivilege?: boolean;
  }) =>
    fetchJson<{ success: boolean; job: OperationLog }>('/packages/uninstall', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePackage: (payload: {
    manager: PackageManagerType;
    name: string;
    isCask?: boolean;
    forceTerminalPrivilege?: boolean;
  }) =>
    fetchJson<{ success: boolean; job: OperationLog }>('/packages/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reinstallPackage: (payload: {
    manager: PackageManagerType;
    name: string;
    isCask?: boolean;
    forceTerminalPrivilege?: boolean;
  }) =>
    fetchJson<{ success: boolean; job: OperationLog }>('/packages/reinstall', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDoctor: () =>
    fetchJson<{
      checks: DoctorCheck[];
      summary: { total: number; healthy: number; warning: number; error: number };
    }>('/doctor'),

  runDoctorAction: (action: DoctorAction) =>
    fetchJson<{ success: boolean; message: string; job?: OperationLog }>('/doctor/run-action', {
      method: 'POST',
      body: JSON.stringify(action),
    }),

  getPorts: () => fetchJson<{ ports: PortInfo[]; total: number }>('/ports'),

  getProcesses: () => fetchJson<{ processes: ProcessInfo[]; total: number }>('/processes'),

  getServices: () => fetchJson<{ services: ServiceInfo[]; total: number }>('/services'),

  stopProcess: (pid: number) =>
    fetchJson<{ success: boolean; message: string }>('/processes/stop', {
      method: 'POST',
      body: JSON.stringify({ pid }),
    }),

  getDocker: () => fetchJson<DockerInfo>('/containers/docker'),

  getAndroid: () => fetchJson<AndroidInfo>('/containers/android'),

  getHistory: () => fetchJson<{ history: OperationLog[] }>('/history'),
};
