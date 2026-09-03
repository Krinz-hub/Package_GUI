import React, { useState } from 'react';
import {
  Cpu,
  RotateCw,
  Square,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
  Layers,
  Server,
  Package,
} from 'lucide-react';
import { ProcessInfo, ServiceInfo } from '@stuff-manager/shared';
import { api } from '../../api/client';

interface ProcessViewProps {
  processes: ProcessInfo[];
  services: ServiceInfo[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const ProcessView: React.FC<ProcessViewProps> = ({
  processes,
  services,
  isLoading,
  onRefresh,
}) => {
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

  const getServiceStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Running
          </span>
        );
      case 'stopped':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Stopped
          </span>
        );
      case 'not_installed':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-900 text-slate-500">
            Not Installed
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-glow-primary">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Processes & Developer Services</h3>
            <p className="text-xs text-slate-400 mt-1">
              Live monitoring of local dev runtimes, background services, CPU/Memory metrics, and open ports
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

      {/* 1. Services Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          Developer Services & Background Daemons
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((svc) => (
            <div key={svc.id} className="glass-card p-5 rounded-2xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-bold text-white text-sm">{svc.displayName}</h5>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{svc.description}</p>
                </div>
                {getServiceStatusBadge(svc.status)}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                {svc.port ? (
                  <span className="text-blue-400 font-semibold flex items-center gap-1">
                    <Radio className="w-3 h-3" /> :{svc.port}
                  </span>
                ) : (
                  <span>Port: -</span>
                )}
                {svc.pid ? <span>PID: {svc.pid}</span> : <span>PID: -</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Processes Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Active Developer Processes ({processes.length})
        </h4>

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
                <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/80 font-sans">
                  <tr>
                    <th className="py-3 px-4">Process Name</th>
                    <th className="py-3 px-4 font-mono">PID</th>
                    <th className="py-3 px-4 font-mono">Port(s)</th>
                    <th className="py-3 px-4 font-mono">CPU</th>
                    <th className="py-3 px-4 font-mono">Memory</th>
                    <th className="py-3 px-4 font-mono">User</th>
                    <th className="py-3 px-4 text-right font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-xs">
                  {processes.map((proc) => (
                    <tr key={proc.pid} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span>{proc.name}</span>
                          {proc.packageName && (
                            <span className="px-2 py-0.5 text-[10px] rounded bg-blue-500/15 text-blue-300 font-mono border border-blue-500/30">
                              {proc.packageName}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs font-normal mt-0.5">
                          {proc.command}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{proc.pid}</td>
                      <td className="py-3.5 px-4">
                        {proc.ports && proc.ports.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {proc.ports.map((port) => (
                              <span
                                key={port}
                                className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit"
                              >
                                <Radio className="w-3 h-3 animate-pulse" />
                                <span>:{port}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{proc.cpu || '0.0%'}</td>
                      <td className="py-3.5 px-4 text-slate-300">{proc.memory || '0.0%'}</td>
                      <td className="py-3.5 px-4 text-slate-400">{proc.user}</td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          {proc.ports && proc.ports.length > 0 && (
                            <a
                              href={`http://localhost:${proc.ports[0]}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleStopProcess(proc)}
                            disabled={stoppingPid === proc.pid}
                            className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs font-medium border border-red-500/30 transition-all flex items-center gap-1 disabled:opacity-50"
                            title="Stop process"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
