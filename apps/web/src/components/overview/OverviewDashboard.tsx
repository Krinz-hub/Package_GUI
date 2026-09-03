import React from 'react';
import {
  Package,
  ArrowUpCircle,
  Activity,
  Cpu,
  Boxes,
  Terminal,
  RotateCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Radio,
  Laptop,
  Server,
} from 'lucide-react';
import { SystemOverview, Package as PackageItem } from '@stuff-manager/shared';
import { NavTab } from '../layout/Sidebar';

interface OverviewDashboardProps {
  overview?: SystemOverview;
  packages: PackageItem[];
  onNavigate: (tab: NavTab) => void;
  onSelectPackage: (pkg: PackageItem) => void;
  onUpdatePackage: (pkg: PackageItem) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  overview,
  packages,
  onNavigate,
  onSelectPackage,
  onUpdatePackage,
}) => {
  const outdatedPackages = packages.filter((p) => p.updateAvailable);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Cross-Platform Operating System & Host Environment Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-500/20 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-[#0c121e]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-glow-primary flex-shrink-0">
            <Laptop className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {overview?.os?.displayName || 'Host Operating System'}
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-mono rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {overview?.os?.platform === 'darwin' ? 'macOS' : overview?.os?.platform === 'win32' ? 'Windows' : 'Linux'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono mt-1">
              <span>Host: <strong className="text-slate-300">{overview?.os?.hostname}</strong></span>
              <span>Kernel: <strong className="text-slate-300">{overview?.os?.kernel}</strong></span>
              <span>Shell: <strong className="text-emerald-400 font-semibold">{overview?.os?.shell}</strong></span>
              <span>Arch: <strong className="text-slate-300">{overview?.os?.arch}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('ports')}
            className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>{overview?.totalPorts || 0} Listening Ports</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Packages */}
        <div
          onClick={() => onNavigate('all-packages')}
          className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-blue-500/50"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Software</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {overview?.totalPackages ?? packages.length}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-blue-400 transition-colors font-sans">
            <span>Explore all installed tools</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Updates Available */}
        <div
          onClick={() => onNavigate('all-packages')}
          className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-amber-500/50"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Upgrades</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 tracking-tight">
            {overview?.totalUpdates ?? outdatedPackages.length}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-amber-400 transition-colors font-sans">
            <span>Review pending updates</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Listening Ports */}
        <div
          onClick={() => onNavigate('ports')}
          className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-blue-500/50"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Listening Ports</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {overview?.totalPorts ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-blue-400 transition-colors font-sans">
            <span>Inspect active network sockets</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Environment Doctor Health */}
        <div
          onClick={() => onNavigate('doctor')}
          className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-emerald-500/50"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">System Doctor</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">
            {overview?.doctorIssuesCount === 0 ? 'Healthy' : `${overview?.doctorIssuesCount ?? 0} Issues`}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1 group-hover:text-emerald-400 transition-colors font-sans">
            <span>Inspect toolchain diagnostics</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 3. Package Managers Status Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Detected Package Managers & Toolchains
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overview?.managers.map((mgr) => {
            const hasUpdates = mgr.updatesCount > 0;
            return (
              <div
                key={mgr.id}
                onClick={() => {
                  if (mgr.id === 'docker' || mgr.id === 'android') {
                    onNavigate('containers');
                  } else {
                    onNavigate(mgr.id as NavTab);
                  }
                }}
                className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-blue-500/40"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors border border-slate-700/60">
                      {mgr.id === 'brew' && <Boxes className="w-5 h-5" />}
                      {mgr.id === 'npm' && <Terminal className="w-5 h-5" />}
                      {mgr.id === 'pip' && <Terminal className="w-5 h-5" />}
                      {mgr.id === 'cargo' && <Terminal className="w-5 h-5" />}
                      {mgr.id === 'winget' && <Package className="w-5 h-5" />}
                      {mgr.id === 'chocolatey' && <Package className="w-5 h-5" />}
                      {mgr.id === 'apt' && <Boxes className="w-5 h-5" />}
                      {mgr.id === 'dnf' && <Boxes className="w-5 h-5" />}
                      {mgr.id === 'pacman' && <Boxes className="w-5 h-5" />}
                      {mgr.id === 'docker' && <Package className="w-5 h-5" />}
                      {mgr.id === 'android' && <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                        {mgr.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        {mgr.installed ? `v${mgr.version || 'installed'}` : 'Not installed'}
                      </p>
                    </div>
                  </div>
                  {mgr.installed ? (
                    <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-slate-800 text-slate-400">
                      ○ Missing
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>{mgr.packageCount} packages installed</span>
                  {hasUpdates && (
                    <span className="text-amber-400 font-semibold">{mgr.updatesCount} updates</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Outdated Packages Quick-Update Widget */}
      {outdatedPackages.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-amber-400" />
                Pending Software Updates ({outdatedPackages.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Packages with newer releases available in your package managers
              </p>
            </div>
            <button
              onClick={() => onNavigate('all-packages')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans"
            >
              <span>View All Packages</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {outdatedPackages.slice(0, 6).map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => onSelectPackage(pkg)}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white text-sm">{pkg.displayName || pkg.name}</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    <span className="text-slate-500">v{pkg.version}</span> →{' '}
                    <span className="text-blue-400 font-semibold">v{pkg.latestVersion}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePackage(pkg);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 transition-all shadow-sm"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  <span>Update</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
