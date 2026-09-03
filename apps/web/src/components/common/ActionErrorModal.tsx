import React from 'react';
import { AlertTriangle, X, Terminal, FileText, RotateCw, Shield, ExternalLink } from 'lucide-react';
import { AppError } from '../../api/client';

interface ActionErrorModalProps {
  error: AppError | Error | null;
  title?: string;
  onClose: () => void;
  onRetry?: () => void;
  onOpenLogs?: () => void;
  onOpenTerminal?: () => void;
}

export const ActionErrorModal: React.FC<ActionErrorModalProps> = ({
  error,
  title = 'Operation Failed',
  onClose,
  onRetry,
  onOpenLogs,
  onOpenTerminal,
}) => {
  if (!error) return null;

  const appErr = error instanceof AppError ? error : new AppError(error.message);

  const getBadge = () => {
    switch (appErr.code) {
      case 'BACKEND_UNAVAILABLE':
        return <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-xs">BACKEND_UNAVAILABLE</span>;
      case 'PERMISSION_ERROR':
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-xs">PERMISSION_REQUIRED</span>;
      case 'PACKAGE_MANAGER_ERROR':
        return <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono text-xs">PACKAGE_MANAGER_ERROR</span>;
      case 'VALIDATION_ERROR':
        return <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-xs">VALIDATION_ERROR</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-xs">{appErr.code}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0e1422] border border-red-500/30 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 bg-red-950/20 border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-glow-error">
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

          {appErr.code === 'BACKEND_UNAVAILABLE' && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
              <div className="font-semibold">Troubleshooting Tip:</div>
              <p className="text-slate-400">
                Ensure the PACKAGE GUI backend server is active. If running via CLI, check that port 4173 is available on 127.0.0.1.
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

          {onOpenTerminal && (
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

          {onRetry && (
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
