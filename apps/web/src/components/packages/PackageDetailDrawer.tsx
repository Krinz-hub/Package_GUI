import React, { useState } from 'react';
import {
  X,
  Package as PackageIcon,
  Copy,
  Check,
  ExternalLink,
  ArrowUpCircle,
  RotateCw,
  Trash2,
  Terminal,
  Shield,
  Folder,
  Layers,
  AlertCircle,
  Clock,
  FileCode,
} from 'lucide-react';
import { Package } from '@stuff-manager/shared';

interface PackageDetailDrawerProps {
  packageData: Package | null;
  onClose: () => void;
  onUpdate: (pkg: Package, forceTerminal?: boolean) => void;
  onReinstall: (pkg: Package, forceTerminal?: boolean) => void;
  onUninstall: (pkg: Package, forceTerminal?: boolean) => void;
}

export const PackageDetailDrawer: React.FC<PackageDetailDrawerProps> = ({
  packageData,
  onClose,
  onUpdate,
  onReinstall,
  onUninstall,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!packageData) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-xl w-full bg-[#0c121e] border-l border-slate-800 shadow-2xl flex flex-col z-50 animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-glow-primary">
              <PackageIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {packageData.displayName || packageData.name}
                </h3>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {packageData.manager}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1">ID: {packageData.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {/* Version & Status Card */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-400 font-medium">Installed Version</span>
              <div className="font-mono text-base font-semibold text-white mt-0.5">
                v{packageData.version}
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Update Status</span>
              <div className="mt-0.5">
                {packageData.updateAvailable ? (
                  <span className="inline-flex items-center gap-1.5 text-blue-400 font-semibold font-mono text-xs">
                    <ArrowUpCircle className="w-4 h-4" /> v{packageData.latestVersion} available
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium text-xs">✓ Up to date</span>
                )}
              </div>
            </div>
          </div>

          {/* How was this installed? Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-blue-400" />
              How was this installed?
            </h4>
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Installation Command</div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#06090e] border border-slate-800 font-mono text-xs text-blue-300">
                  <span>$ {packageData.installCommand}</span>
                  <button
                    onClick={() => copyToClipboard(packageData.installCommand, 'cmd')}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Copy command"
                  >
                    {copiedKey === 'cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Installation Path / Location</div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#06090e] border border-slate-800 font-mono text-xs text-slate-300">
                  <span className="truncate pr-2">{packageData.location}</span>
                  <button
                    onClick={() => copyToClipboard(packageData.location, 'loc')}
                    className="text-slate-400 hover:text-white transition-colors p-1 flex-shrink-0"
                    title="Copy path"
                  >
                    {copiedKey === 'loc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Links */}
          {packageData.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</h4>
              <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
                {packageData.description}
              </p>
            </div>
          )}

          {/* Links & Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {packageData.homepage && (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Homepage</span>
                <a
                  href={packageData.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-blue-400 hover:underline truncate"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{packageData.homepage}</span>
                </a>
              </div>
            )}
            {packageData.license && (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">License</span>
                <div className="mt-1 font-semibold text-slate-200">{packageData.license}</div>
              </div>
            )}
          </div>

          {/* Dependencies */}
          {packageData.dependencies && packageData.dependencies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                Dependencies ({packageData.dependencies.length})
              </h4>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-900/50 border border-slate-800/60">
                {packageData.dependencies.map((dep) => (
                  <span
                    key={dep}
                    className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Caveats */}
          {packageData.caveats && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="w-4 h-4" /> Package Caveats
              </div>
              <pre className="font-mono text-[11px] whitespace-pre-wrap text-amber-200/90 max-h-32 overflow-y-auto">
                {packageData.caveats}
              </pre>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-900/90 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {packageData.updateAvailable && (
              <button
                onClick={() => onUpdate(packageData)}
                className="px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow-primary transition-all"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Update</span>
              </button>
            )}
            <button
              onClick={() => onReinstall(packageData)}
              className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
            >
              <RotateCw className="w-4 h-4" />
              <span>Reinstall</span>
            </button>
            <button
              onClick={() => onUninstall(packageData)}
              className="px-3 py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-red-500/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Uninstall</span>
            </button>
          </div>

          {/* Privileged in macOS Terminal button */}
          <button
            onClick={() => onUpdate(packageData, true)}
            className="w-full py-2 rounded-lg bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center justify-center gap-2 border border-slate-800 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Run Action with Admin Privileges in Terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
