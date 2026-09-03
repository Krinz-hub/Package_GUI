import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Terminal,
  FileText,
  RotateCw,
  Shield,
  FolderPlus,
  Boxes,
  HelpCircle,
} from 'lucide-react';
import { AppError, api } from '../../api/client';

interface ActionErrorModalProps {
  error: AppError | Error | null;
  title?: string;
  onClose: () => void;
  onRetry?: (options?: { allowBreakSystemPackages?: boolean }) => void;
  onOpenLogs?: () => void;
  onOpenTerminal?: () => void;
  onSuccessRefresh?: () => void;
}

export const ActionErrorModal: React.FC<ActionErrorModalProps> = ({
  error,
  title = 'Operation Failed',
  onClose,
  onRetry,
  onOpenLogs,
  onOpenTerminal,
  onSuccessRefresh,
}) => {
  const [isCreatingVenv, setIsCreatingVenv] = useState(false);
  const [venvCreatedMsg, setVenvCreatedMsg] = useState<string | null>(null);
  const [showBreakWarning, setShowBreakWarning] = useState(false);

  if (!error) return null;

  const appErr = error instanceof AppError ? error : new AppError(error.message);

  const handleCreateVenv = async () => {
    setIsCreatingVenv(true);
    try {
      const res = await api.createVirtualEnvironment();
      if (res.ok) {
        setVenvCreatedMsg(`✓ Virtual environment created at ${res.envPath}`);
        onSuccessRefresh?.();
        setTimeout(() => {
          onClose();
          if (onRetry) onRetry();
        }, 1200);
      }
    } catch (err: any) {
      alert(`Failed to create virtual environment: ${err.message}`);
    } finally {
      setIsCreatingVenv(false);
    }
  };

  const getBadge = () => {
    switch (appErr.code) {
      case 'PYTHON_EXTERNALLY_MANAGED':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs border border-amber-500/40">
            PEP 668: EXTERNALLY_MANAGED
          </span>
        );
      case 'BACKEND_UNAVAILABLE':
      case 'NETWORK_ERROR':
        return (
          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-xs border border-red-500/30">
            BACKEND_UNAVAILABLE
          </span>
        );
      case 'PERMISSION_ERROR':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-xs border border-amber-500/30">
            PERMISSION_REQUIRED
          </span>
        );
      case 'PACKAGE_MANAGER_ERROR':
        return (
          <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono text-xs border border-orange-500/30">
            PACKAGE_MANAGER_ERROR
          </span>
        );
      case 'VALIDATION_ERROR':
        return (
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-xs border border-purple-500/30">
            VALIDATION_ERROR
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-mono text-xs border border-yellow-500/30">
            OPERATION_TIMEOUT
          </span>
        );
      case 'PROCESS_ERROR':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono text-xs border border-rose-500/30">
            PROCESS_ERROR
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
            {appErr.code}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0e1422] border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-glow-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
              <div className="mt-0.5">{getBadge()}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-red-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
            {appErr.message}
          </div>

          {/* PEP 668 Action Remediation Box */}
          {appErr.code === 'PYTHON_EXTERNALLY_MANAGED' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <Boxes className="w-4 h-4 text-amber-400" />
                <span>Python Environment Remediation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This Python installation is managed by Homebrew or your OS. System-wide pip installations are restricted by PEP 668 to protect stability.
              </p>

              {venvCreatedMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium border border-emerald-500/30">
                  {venvCreatedMsg}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleCreateVenv}
                  disabled={isCreatingVenv}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingVenv ? 'Creating .venv...' : 'Create Virtual Environment (.venv)'}</span>
                </button>

                {onOpenTerminal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTerminal();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Open Terminal</span>
                  </button>
                )}
              </div>

              {/* Advanced Override */}
              <div className="pt-2 border-t border-slate-800/80">
                {!showBreakWarning ? (
                  <button
                    onClick={() => setShowBreakWarning(true)}
                    className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-mono"
                  >
                    <span>▸ Advanced: Install into managed environment anyway</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 space-y-2 mt-1 animate-fade-in">
                    <div className="text-xs font-semibold text-red-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <span>Warning: Break System Packages</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Passing <code className="text-red-300 font-mono">--break-system-packages</code> can interfere with Homebrew or OS packages and cause system instability.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          onClose();
                          if (onRetry) onRetry({ allowBreakSystemPackages: true });
                        }}
                        className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all"
                      >
                        Install Anyway
                      </button>
                      <button
                        onClick={() => setShowBreakWarning(false)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {appErr.code === 'BACKEND_UNAVAILABLE' && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
              <div className="font-semibold">Troubleshooting Tip:</div>
              <p className="text-slate-400">
                Ensure the PACKAGE GUI backend server is active on 127.0.0.1:4173. Run with --debug for full traces.
              </p>
            </div>
          )}

          {appErr.code === 'PERMISSION_ERROR' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Administrator Privileges Required
              </div>
              <p className="text-slate-400">
                This operation requires root or sudo privileges. Click "Open Terminal" below to execute the command in your native OS terminal.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end gap-2.5">
          {onOpenLogs && (
            <button
              onClick={() => {
                onClose();
                onOpenLogs();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>View Live Logs</span>
            </button>
          )}

          {onOpenTerminal && appErr.code !== 'PYTHON_EXTERNALLY_MANAGED' && (
            <button
              onClick={() => {
                onClose();
                onOpenTerminal();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open Terminal</span>
            </button>
          )}

          {onRetry && appErr.code !== 'PYTHON_EXTERNALLY_MANAGED' && (
            <button
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
