import React from 'react';
import {
  Package,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Layers,
  HardDrive,
  Radio,
} from 'lucide-react';
import { DockerInfo, AndroidInfo } from '@stuff-manager/shared';

interface ContainersViewProps {
  dockerInfo?: DockerInfo;
  androidInfo?: AndroidInfo;
  isLoading: boolean;
  onRefresh: () => void;
}

export const ContainersView: React.FC<ContainersViewProps> = ({
  dockerInfo,
  androidInfo,
  isLoading,
  onRefresh,
}) => {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Containers & Mobile SDKs</h3>
            <p className="text-xs text-slate-400 mt-1">
              Docker Engine daemon, container states, images, and Android ADB device connections
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Docker Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            Docker Engine & Containers
          </h4>
          <div className="flex items-center gap-2">
            {dockerInfo?.daemonRunning ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Daemon Running ({dockerInfo.clientVersion})
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Docker Daemon Stopped
              </span>
            )}
          </div>
        </div>

        {dockerInfo?.daemonRunning ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Containers */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h5 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Containers ({dockerInfo.containers.length})
              </h5>
              {dockerInfo.containers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No containers created yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {dockerInfo.containers.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{c.name}</span>
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                            c.state === 'running'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {c.state}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">{c.image}</div>
                      {c.ports && <div className="text-[11px] font-mono text-blue-300">{c.ports}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Images */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h5 className="font-bold text-white text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                Local Images ({dockerInfo.images.length})
              </h5>
              {dockerInfo.images.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No local images pulled.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {dockerInfo.images.map((img) => (
                    <div
                      key={img.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {img.repository}:{img.tag}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {img.id.slice(0, 12)}</div>
                      </div>
                      <span className="font-mono text-xs text-slate-400">{img.size}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <p className="text-sm text-slate-300">
              Docker CLI is available on your Mac, but the Docker daemon is currently inactive.
            </p>
            <p className="text-xs text-slate-400 font-mono">
              Launch Docker Desktop (/Applications/Docker.app) to inspect containers and images.
            </p>
          </div>
        )}
      </div>

      {/* Android SDK & ADB Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Android SDK & ADB
          </h4>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {androidInfo?.available ? 'ADB Ready' : 'ADB Unavailable'}
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-slate-400">ADB Executable Location</span>
              <div className="font-mono text-slate-200 truncate">{androidInfo?.adbPath || 'Not found'}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-slate-400">Android SDK Home</span>
              <div className="font-mono text-slate-200 truncate">{androidInfo?.sdkPath || 'Not configured'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              Connected Devices / Emulators ({androidInfo?.devices.length || 0})
            </h5>
            {!androidInfo?.devices || androidInfo.devices.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400 font-mono">
                No active USB devices or emulators attached via adb devices.
              </div>
            ) : (
              <div className="space-y-2">
                {androidInfo.devices.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{d.model}</span>
                      <div className="text-[11px] font-mono text-slate-400">
                        Serial: {d.id} | Product: {d.product}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[11px]">
                      {d.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
