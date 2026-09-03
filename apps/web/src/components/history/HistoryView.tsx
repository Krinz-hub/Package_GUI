import React from 'react';
import {
  History as HistoryIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  RotateCw,
  Eye,
} from 'lucide-react';
import { OperationLog } from '@stuff-manager/shared';
import { useTerminal } from '../../context/TerminalContext';

interface HistoryViewProps {
  history: OperationLog[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, isLoading, onRefresh }) => {
  const { startJob } = useTerminal();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <RotateCw className="w-4 h-4 animate-spin text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Operation History</h3>
            <p className="text-xs text-slate-400 mt-1">
              Audit logs of all package installations, updates, reinstalls, and uninstalls
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
            <p className="text-sm font-medium text-slate-300">Loading activity history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2 glass-panel rounded-2xl">
            <HistoryIcon className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-300">No operations recorded yet</p>
            <p className="text-xs text-slate-400">
              Operations you run in PACKAGE GUI will appear here with full execution logs.
            </p>
          </div>
        ) : (
          history.map((op) => (
            <div
              key={op.id}
              className="glass-card p-4 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center">
                  {getStatusIcon(op.status)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {op.action.toUpperCase()} {op.packageName}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800 text-slate-300">
                      {op.manager}
                    </span>
                    {op.requiresPrivilege && (
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Admin Privileges
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    <span>$ {op.command}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="text-right font-mono text-slate-400">
                  <div>{new Date(op.startTime).toLocaleTimeString()}</div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(op.startTime).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => startJob(op)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-all border border-slate-700"
                  title="View full log in Live Terminal"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>View Log</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
