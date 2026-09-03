import React from 'react';
import {
  Settings,
  ShieldCheck,
  Server,
  Lock,
  Terminal,
  Database,
  Info,
} from 'lucide-react';
import { SystemOverview } from '@stuff-manager/shared';

interface SettingsViewProps {
  overview?: SystemOverview;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ overview }) => {
  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-4xl">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Application Settings & Security</h3>
          <p className="text-xs text-slate-400 mt-1">
            Local server architecture, host bindings, and system integrity status
          </p>
        </div>
      </div>

      {/* Security Architecture Box */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h4 className="font-bold text-white text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Security & Privacy Guarantees
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strictly Local Execution</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Bound exclusively to <code className="text-blue-300">127.0.0.1:4173</code>. No external telemetry or cloud dependencies.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Zero Password Exposure</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Administrator operations launch native macOS Terminal. Sudo passwords never enter the browser or backend.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>Safe Process Spawning</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Strict schema validation and explicit argument arrays prevent arbitrary shell script injection.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Embedded SQLite Cache</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Activity history is saved locally in <code className="text-blue-300">~/.package-gui/data.db</code>.
            </p>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h4 className="font-bold text-white text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          Host Environment Details
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400 font-sans">Platform</div>
            <div className="text-white mt-0.5">{overview?.os.platform} ({overview?.os.arch})</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400 font-sans">macOS Kernel</div>
            <div className="text-white mt-0.5">{overview?.os.release}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-slate-400 font-sans">Hostname</div>
            <div className="text-white mt-0.5">{overview?.os.hostname}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
