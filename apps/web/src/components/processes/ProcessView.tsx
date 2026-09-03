import React, { useState } from 'react';
import { Cpu, RotateCw, Square, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import { ProcessInfo } from '@stuff-manager/shared';
import { api } from '../../api/client';

interface ProcessViewProps {
  processes: ProcessInfo[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const ProcessView: React.FC<ProcessViewProps> = ({ processes, isLoading, onRefresh }) => {
  const [stoppingPid, setStoppingPid] = useState<number | null>(null);

  const handleStopProcess = async (proc: ProcessInfo) => {
    if (!window.confirm(`Are you sure you want to stop process "${proc.name}" (PID: ${proc.pid})?`)) {
      return;
    }

    setStoppingPid(proc.pid);
    try {
      const res = await api.stopProcess(proc.pid);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(`Failed to stop process: ${err.message}`);
    } finally {
      setStoppingPid(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Processes & Listening Ports</h3>
            <p className="text-xs text-slate-400 mt-1">
              Inspect active developer servers, background daemons, and listening TCP ports
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Processes</span>
        </button>
      </div>

      {/* Process Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-glass">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
            <p className="text-sm font-medium text-slate-300">Scanning active developer processes...</p>
          </div>
        ) : processes.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
            <p className="text-sm font-semibold text-slate-300">No active dev servers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Process Name</th>
                  <th className="py-3 px-4">PID</th>
                  <th className="py-3 px-4">Port</th>
                  <th className="py-3 px-4">CPU</th>
                  <th className="py-3 px-4">Memory</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-xs">
                {processes.map((proc) => (
                  <tr key={proc.pid} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      <div>
                        <span>{proc.name}</span>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs font-normal">
                          {proc.command}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{proc.pid}</td>
                    <td className="py-3.5 px-4">
                      {proc.port ? (
                        <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit">
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span>:{proc.port}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{proc.cpu || '0.0%'}</td>
                    <td className="py-3.5 px-4 text-slate-300">{proc.memory || '0.0%'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{proc.user}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleStopProcess(proc)}
                        disabled={stoppingPid === proc.pid}
                        className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs font-sans font-medium border border-red-500/30 transition-all flex items-center gap-1 ml-auto disabled:opacity-50"
                        title="Stop process"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
