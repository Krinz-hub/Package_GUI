import React from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RotateCw,
  Terminal,
  Folder,
  Copy,
  Check,
} from 'lucide-react';
import { DoctorCheck } from '@stuff-manager/shared';

interface DoctorViewProps {
  checks: DoctorCheck[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ checks, isLoading, onRefresh }) => {
  const [copiedCmd, setCopiedCmd] = React.useState<string | null>(null);

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Warning
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" /> Error
          </span>
        );
      case 'not_installed':
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3.5 h-3.5" /> Not Installed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-success">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Environment Doctor</h3>
            <p className="text-xs text-slate-400 mt-1">
              Automatic inspection of your macOS developer toolchain, PATH integrity, and runtimes
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Re-run Diagnostics</span>
        </button>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((check) => (
          <div
            key={check.id}
            className="glass-card p-5 rounded-2xl space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base">{check.name}</h4>
                  {check.version && (
                    <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300">
                      {check.version}
                    </span>
                  )}
                </div>
                {getStatusBadge(check.status)}
              </div>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{check.message}</p>

              {check.path && (
                <div className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-slate-400 truncate bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <Folder className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{check.path}</span>
                </div>
              )}
            </div>

            {check.suggestion && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1.5">
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Recommendation:
                </span>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 font-mono text-[11px] text-amber-100">
                  <span className="truncate pr-2">{check.suggestion}</span>
                  <button
                    onClick={() => copyCmd(check.suggestion!)}
                    className="text-amber-300 hover:text-white transition-colors"
                  >
                    {copiedCmd === check.suggestion ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
