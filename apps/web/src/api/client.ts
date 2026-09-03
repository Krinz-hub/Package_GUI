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

export type ErrorCategory =
  | 'NETWORK_ERROR'
  | 'BACKEND_UNAVAILABLE'
  | 'API_ERROR'
  | 'PERMISSION_ERROR'
  | 'PACKAGE_MANAGER_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT'
  | 'PROCESS_ERROR'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  public code: ErrorCategory;
  public status?: number;
  public details?: any;
  public backendUrl: string;

  constructor(message: string, code: ErrorCategory = 'UNKNOWN_ERROR', status?: number, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.backendUrl = window.location.origin;
  }
}

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${API_BASE}${url}`;

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
  } catch (networkErr: any) {
    // Catch browser network errors (e.g. ECONNREFUSED, proxy failure, server down)
    const errorMsg = `Unable to connect to PACKAGE GUI backend at ${window.location.origin}. Server may be offline or starting up.`;
    throw new AppError(errorMsg, 'BACKEND_UNAVAILABLE', 0, networkErr.message);
  }

  // If HTTP status is error
  if (!res.ok) {
    let errorData: any = null;
    let message = `Request to ${url} failed with status ${res.status} (${res.statusText})`;
    let code: ErrorCategory = 'API_ERROR';

    try {
      errorData = await res.json();
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          message = errorData.error;
        } else if (errorData.error.message) {
          message = errorData.error.message;
          if (errorData.error.code) {
            code = errorData.error.code as ErrorCategory;
          }
        }
      }
    } catch (_) {
      // Non-JSON error body
      try {
        const text = await res.text();
        if (text) message = text.slice(0, 200);
      } catch (_) {}
    }

    if (res.status === 403 || res.status === 401) {
      code = 'PERMISSION_ERROR';
    } else if (res.status === 400) {
      code = code === 'API_ERROR' ? 'VALIDATION_ERROR' : code;
    } else if (res.status === 404) {
      code = 'API_ERROR';
    } else if (res.status >= 500) {
      code = code === 'API_ERROR' ? 'PACKAGE_MANAGER_ERROR' : code;
    }

    throw new AppError(message, code, res.status, errorData);
  }

  try {
    return (await res.json()) as T;
  } catch (jsonErr: any) {
    throw new AppError(`Malformed response from server for ${url}`, 'API_ERROR', res.status, jsonErr.message);
  }
}

export interface HealthCheckResult {
  ok: boolean;
  service: string;
  version: string;
  platform: string;
  uptime: number;
  timestamp: string;
}

export const api = {
  checkHealth: () => fetchJson<HealthCheckResult>('/health'),

  getOverview: () => fetchJson<SystemOverview>('/overview'),

  getPackages: (manager?: PackageManagerType) =>
    fetchJson<{ packages: Package[]; total: number }>(
      manager ? `/packages?manager=${manager}` : '/packages'
    ),

  getPackage: (id: string) =>
    fetchJson<{ ok: boolean; package: Package }>(`/packages/${encodeURIComponent(id)}`).then(
      (res) => res.package || (res as any)
    ),

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
    fetchJson<{ ok: boolean; success: boolean; job: OperationLog }>('/packages/install', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uninstallPackage: (payload: {
    manager: PackageManagerType;
    name: string;
    isCask?: boolean;
    forceTerminalPrivilege?: boolean;
  }) =>
    fetchJson<{ ok: boolean; success: boolean; job: OperationLog }>('/packages/uninstall', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePackage: (payload: {
    manager: PackageManagerType;
    name: string;
    isCask?: boolean;
    forceTerminalPrivilege?: boolean;
  }) =>
    fetchJson<{ ok: boolean; success: boolean; job: OperationLog }>('/packages/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reinstallPackage: (payload: {
    manager: PackageManagerType;
    name: string;
    isCask?: boolean;
    forceTerminalPrivilege?: boolean;
  }) =>
    fetchJson<{ ok: boolean; success: boolean; job: OperationLog }>('/packages/reinstall', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDoctor: () =>
    fetchJson<{
      ok: boolean;
      checks: DoctorCheck[];
      summary: { total: number; healthy: number; warning: number; error: number };
    }>('/doctor'),

  runDoctorAction: (action: DoctorAction) =>
    fetchJson<{ ok: boolean; success: boolean; message: string; job?: OperationLog }>('/doctor/run-action', {
      method: 'POST',
      body: JSON.stringify(action),
    }),

  getPorts: () => fetchJson<{ ok: boolean; ports: PortInfo[]; total: number }>('/ports'),

  getProcesses: () => fetchJson<{ ok: boolean; processes: ProcessInfo[]; total: number }>('/processes'),

  getServices: () => fetchJson<{ ok: boolean; services: ServiceInfo[]; total: number }>('/services'),

  stopProcess: (pid: number) =>
    fetchJson<{ ok: boolean; success: boolean; message: string }>(`/processes/${pid}/stop`, {
      method: 'POST',
    }),

  getDocker: () => fetchJson<DockerInfo>('/containers/docker'),

  getAndroid: () => fetchJson<AndroidInfo>('/containers/android'),

  getHistory: () => fetchJson<{ ok: boolean; history: OperationLog[] }>('/history'),
};
