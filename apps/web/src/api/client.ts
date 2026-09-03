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
  | 'PYTHON_EXTERNALLY_MANAGED'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT'
  | 'PROCESS_ERROR'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  public code: ErrorCategory;
  public status?: number;
  public details?: any;
  public backendUrl: string;
  public timestamp: string;

  constructor(
    message: string,
    code: ErrorCategory = 'UNKNOWN_ERROR',
    status?: number,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.backendUrl = window.location.origin;
    this.timestamp = new Date().toISOString();
  }
}

// API base resolution: Use Vite env override if provided, otherwise relative /api
const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  return '/api';
};

const API_BASE = getApiBaseUrl();

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

async function fetchJson<T>(url: string, options?: FetchOptions): Promise<T> {
  const fullUrl = `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
  const timeoutMs = options?.timeoutMs ?? 30000; // 30s timeout

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Only declare Content-Type: application/json when an actual body is provided
  if (options?.body !== undefined && options?.body !== null) {
    if (!reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
  }

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: reqHeaders,
      ...options,
    });
  } catch (networkErr: any) {
    clearTimeout(timeoutId);
    if (networkErr.name === 'AbortError') {
      throw new AppError(
        `Request to ${url} timed out after ${timeoutMs / 1000}s. The backend may be processing a heavy system task or is unresponsive.`,
        'TIMEOUT',
        408
      );
    }
    // Catch browser network errors (e.g. ECONNREFUSED, proxy failure, server down, CORS preflight fail)
    const errorMsg = `Unable to connect to PACKAGE GUI backend (${window.location.origin}). The local server may be starting up, offline, or blocked by local security policy.`;
    throw new AppError(errorMsg, 'BACKEND_UNAVAILABLE', 0, networkErr.message || String(networkErr));
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle non-2xx HTTP responses
  if (!res.ok) {
    let errorData: any = null;
    let message = `Server responded with status ${res.status} (${res.statusText}) for ${url}`;
    let code: ErrorCategory = 'API_ERROR';

    try {
      errorData = await res.json();
      if (errorData) {
        if (typeof errorData.error === 'string') {
          message = errorData.error;
        } else if (errorData.error && typeof errorData.error === 'object') {
          message = errorData.error.message || message;
          if (errorData.error.code) {
            const rawCode = String(errorData.error.code);
            if (rawCode === 'PYTHON_EXTERNALLY_MANAGED' || rawCode.includes('EXTERNALLY_MANAGED')) {
              code = 'PYTHON_EXTERNALLY_MANAGED';
            } else if (rawCode.includes('PERMISSION') || rawCode.includes('SUDO')) {
              code = 'PERMISSION_ERROR';
            } else if (rawCode.includes('PACKAGE') || rawCode.includes('INSTALL') || rawCode.includes('UNINSTALL')) {
              code = 'PACKAGE_MANAGER_ERROR';
            } else if (rawCode.includes('VALIDATION')) {
              code = 'VALIDATION_ERROR';
            } else if (rawCode.includes('PROCESS')) {
              code = 'PROCESS_ERROR';
            } else if (rawCode.includes('BACKEND')) {
              code = 'BACKEND_UNAVAILABLE';
            } else {
              code = (rawCode as ErrorCategory) || 'API_ERROR';
            }
          }
        } else if (errorData.message) {
          message = errorData.message;
        }
      }
    } catch (_) {
      try {
        const text = await res.text();
        if (text && text.trim()) message = text.trim().slice(0, 300);
      } catch (_) {}
    }

    // Status code fallbacks
    if (res.status === 422 && code === 'API_ERROR') {
      code = 'PYTHON_EXTERNALLY_MANAGED';
    } else if (res.status === 401 || res.status === 403) {
      code = 'PERMISSION_ERROR';
    } else if (res.status === 400) {
      code = code === 'API_ERROR' ? 'VALIDATION_ERROR' : code;
    } else if (res.status === 404) {
      code = 'API_ERROR';
    } else if (res.status === 502 || res.status === 503 || res.status === 504) {
      code = 'BACKEND_UNAVAILABLE';
    } else if (res.status >= 500 && code === 'API_ERROR') {
      code = 'PACKAGE_MANAGER_ERROR';
    }

    throw new AppError(message, code, res.status, errorData);
  }

  // Parse JSON response body
  try {
    return (await res.json()) as T;
  } catch (jsonErr: any) {
    throw new AppError(
      `Malformed JSON response from server for ${url}`,
      'API_ERROR',
      res.status,
      jsonErr.message
    );
  }
}

export interface HealthCheckResult {
  ok: boolean;
  service: string;
  version: string;
  platform: string;
  arch?: string;
  nodeVersion?: string;
  uptime: number;
  timestamp: string;
}

export const api = {
  checkHealth: () => fetchJson<HealthCheckResult>('/health', { timeoutMs: 5000 }),

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

  getPythonEnvironments: () =>
    fetchJson<{ ok: boolean; environments: any[]; active: any }>('/python/environments'),

  createVirtualEnvironment: (payload?: { targetDir?: string; envName?: string }) =>
    fetchJson<{ ok: boolean; success: boolean; message: string; envPath: string; pythonPath: string }>(
      '/python/create-venv',
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }
    ),

  installPackage: (payload: {
    manager: PackageManagerType;
    name: string;
    isCask?: boolean;
    global?: boolean;
    forceTerminalPrivilege?: boolean;
    allowBreakSystemPackages?: boolean;
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
    allowBreakSystemPackages?: boolean;
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
    allowBreakSystemPackages?: boolean;
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
    allowBreakSystemPackages?: boolean;
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
