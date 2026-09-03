import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RotateCw,
  Folder,
  Copy,
  Check,
  Play,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { DoctorCheck, DoctorAction } from '@stuff-manager/shared';
import { api } from '../../api/client';
import { useTerminal } from '../../context/TerminalContext';

interface DoctorViewProps {
  checks: DoctorCheck[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ checks, isLoading, onRefresh }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string; isError?: boolean } | null>(null);
  const { startJob, setPrivilegedDialog } = useTerminal();

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleRunAction = async (action: DoctorAction) => {
    if (action.requiresTerminal && action.type === 'command') {
      setPrivilegedDialog({
        isOpen: true,
        jobName: action.label,
        command: action.command || action.label,
        onConfirm: async () => {
          setRunningActionId(action.id);
          try {
            const res = await api.runDoctorAction(action);
            if (res.job) startJob(res.job);
            setActionFeedback({ id: action.id, message: res.message || 'Action launched' });
            setTimeout(() => onRefresh(), 2000);
          } catch (err: any) {
            setActionFeedback({ id: action.id, message: err.message, isError: true });
          } finally {
            setRunningActionId(null);
          }
        },
        onCancel: () => {},
      });
      return;
    }

    setRunningActionId(action.id);
    setActionFeedback(null);
    try {
      const res = await api.runDoctorAction(action);
      if (res.job) {
        startJob(res.job);
      }
      setActionFeedback({ id: action.id, message: res.message || 'Action executed successfully' });
      setTimeout(() => onRefresh(), 3000);
    } catch (err: any) {
      setActionFeedback({ id: action.id, message: err.message, isError: true });
    } finally {
      setRunningActionId(null);
    }
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
              Automated diagnostics of your local toolchains, PATH configuration, runtimes, and actionable remediation
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
        {checks.map((check) => {
          const isActionRunning = runningActionId === check.action?.id;
          const currentFeedback = actionFeedback?.id === check.action?.id ? actionFeedback : null;

          return (
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

              {/* Actionable Recommendation Card with [ Run ] and [ Copy ] Buttons */}
              {(check.action || check.suggestion) && (
                <div className="mt-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      Recommendation: {check.action?.label || 'Action Required'}
                    </span>
                  </div>

                  {check.suggestion && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/90 font-mono text-[11px] text-amber-100 border border-amber-500/20">
                      <span className="truncate pr-2">{check.suggestion}</span>
                      <button
                        onClick={() => copyCmd(check.suggestion!)}
                        className="text-amber-300 hover:text-white transition-colors p-1"
                        title="Copy command"
                      >
                        {copiedCmd === check.suggestion ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Action execution buttons */}
                  {check.action && (
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div className="text-[11px] text-slate-400">
                        {currentFeedback ? (
                          <span className={currentFeedback.isError ? 'text-red-400' : 'text-emerald-400'}>
                            {currentFeedback.message}
                          </span>
                        ) : check.action.requiresTerminal ? (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Shield className="w-3 h-3 text-amber-400" />
                            Admin permission via Terminal
                          </span>
                        ) : (
                          <span>Safe local action</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {check.suggestion && (
                          <button
                            onClick={() => copyCmd(check.suggestion!)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleRunAction(check.action!)}
                          disabled={isActionRunning}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isActionRunning ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>Run</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
