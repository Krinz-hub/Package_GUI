import React, { useState } from 'react';
import {
  Radio,
  RotateCw,
  ExternalLink,
  Square,
  Package,
  Layers,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { PortInfo } from '@stuff-manager/shared';
import { api } from '../../api/client';

interface PortsViewProps {
  ports: PortInfo[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectPackageId?: (pkgId: string) => void;
}

export const PortsView: React.FC<PortsViewProps> = ({
  ports,
  isLoading,
  onRefresh,
  onSelectPackageId,
}) => {
  const [filter, setFilter] = useState('');
  const [stoppingPid, setStoppingPid] = useState<number | null>(null);

  const filteredPorts = ports.filter((p) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      p.port.toString().includes(q) ||
      p.processName.toLowerCase().includes(q) ||
      p.command.toLowerCase().includes(q) ||
      (p.packageName && p.packageName.toLowerCase().includes(q)) ||
      p.address.toLowerCase().includes(q) ||
      p.pid.toString().includes(q)
    );
  });

  const handleStop = async (port: PortInfo) => {
    if (
      !window.confirm(
        `Are you sure you want to stop process "${port.processName}" (PID: ${port.pid}) listening on port ${port.port}?`
      )
    ) {
      return;
    }

    setStoppingPid(port.pid);
    try {
      const res = await api.stopProcess(port.pid);
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
          <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-glow-primary">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Listening Ports & Network Services</h3>
            <p className="text-xs text-slate-400 mt-1">
              Live inspection of local TCP/UDP ports mapped to running processes and installed packages
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Scan Ports</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by port, process, PID, package..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filteredPorts.length} active listening ports detected
        </div>
      </div>

      {/* Ports Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-glass">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
            <p className="text-sm font-medium text-slate-300">Scanning local network sockets...</p>
          </div>
        ) : filteredPorts.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
            <p className="text-sm font-semibold text-slate-300">No matching listening ports</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4 font-mono">Port</th>
                  <th className="py-3 px-4">Process & PID</th>
                  <th className="py-3 px-4">Bound Address</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Linked Package</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-xs">
                {filteredPorts.map((port) => (
                  <tr key={`${port.port}-${port.pid}`} className="hover:bg-slate-800/40 transition-colors">
                    {/* Port */}
                    <td className="py-3.5 px-4 font-bold text-white font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-sm">
                        :{port.port}
                      </span>
                    </td>

                    {/* Process & PID */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{port.processName}</span>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">
                          PID {port.pid}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs font-normal mt-0.5">
                        {port.command}
                      </div>
                    </td>

                    {/* Bound Address */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <span>{port.address}</span>
                      <span className="text-slate-400 text-[10px] ml-1">({port.protocol})</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {port.status}
                      </span>
                    </td>

                    {/* Linked Package (Port -> PID -> Process -> Package) */}
                    <td className="py-3.5 px-4 font-sans">
                      {port.packageName ? (
                        <div
                          onClick={() => port.packageId && onSelectPackageId?.(port.packageId)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-blue-300 border border-slate-700 hover:border-blue-500/50 cursor-pointer transition-all text-xs"
                          title="View package details"
                        >
                          <Package className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-medium">{port.packageName}</span>
                          {port.packageManager && (
                            <span className="text-[10px] font-mono px-1 rounded bg-slate-900 text-slate-400">
                              {port.packageManager}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unknown source</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 font-sans">
                        <a
                          href={`http://localhost:${port.port}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-all flex items-center gap-1"
                          title="Open http://localhost:<port>"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open</span>
                        </a>
                        <button
                          onClick={() => handleStop(port)}
                          disabled={stoppingPid === port.pid}
                          className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs font-medium border border-red-500/30 transition-all flex items-center gap-1 disabled:opacity-50"
                          title="Stop process listening on this port"
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
  );
};
