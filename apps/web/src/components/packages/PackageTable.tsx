import React, { useState } from 'react';
import {
  Package as PackageIcon,
  ArrowUpCircle,
  RotateCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  Folder,
} from 'lucide-react';
import { Package, PackageManagerType } from '@stuff-manager/shared';

interface PackageTableProps {
  packages: Package[];
  isLoading: boolean;
  onSelectPackage: (pkg: Package) => void;
  onUpdatePackage: (pkg: Package) => void;
  onReinstallPackage: (pkg: Package) => void;
  onUninstallPackage: (pkg: Package) => void;
}

export const PackageTable: React.FC<PackageTableProps> = ({
  packages,
  isLoading,
  onSelectPackage,
  onUpdatePackage,
  onReinstallPackage,
  onUninstallPackage,
}) => {
  const [activeSubFilter, setActiveSubFilter] = useState<'all' | 'formula' | 'cask' | 'updates'>('all');

  const filtered = packages.filter((p) => {
    if (activeSubFilter === 'formula') return p.type === 'formula';
    if (activeSubFilter === 'cask') return p.type === 'cask';
    if (activeSubFilter === 'updates') return p.updateAvailable;
    return true;
  });

  const getManagerBadge = (manager: PackageManagerType, type: string) => {
    switch (manager) {
      case 'brew':
        return type === 'cask' ? (
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            brew cask
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            brew formula
          </span>
        );
      case 'npm':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-red-500/15 text-red-300 border border-red-500/30">
            npm global
          </span>
        );
      case 'pip':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
            python pip
          </span>
        );
      case 'cargo':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
            cargo bin
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800 text-slate-300">
            {manager}
          </span>
        );
    }
  };

  const updatesCount = packages.filter((p) => p.updateAvailable).length;
  const formulaeCount = packages.filter((p) => p.type === 'formula').length;
  const casksCount = packages.filter((p) => p.type === 'cask').length;

  return (
    <div className="space-y-4">
      {/* Sub-filters bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveSubFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All ({packages.length})
          </button>
          {formulaeCount > 0 && (
            <button
              onClick={() => setActiveSubFilter('formula')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubFilter === 'formula'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Formulae ({formulaeCount})
            </button>
          )}
          {casksCount > 0 && (
            <button
              onClick={() => setActiveSubFilter('cask')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSubFilter === 'cask'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Casks ({casksCount})
            </button>
          )}
          {updatesCount > 0 && (
            <button
              onClick={() => setActiveSubFilter('updates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeSubFilter === 'updates'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Updates Available ({updatesCount})</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {filtered.length} of {packages.length} installed
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-glass">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
            <p className="text-sm font-medium text-slate-300">Scanning local package managers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <PackageIcon className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-base font-semibold text-slate-300">No packages found</p>
            <p className="text-xs text-slate-400">
              Try adjusting your search query or select another package manager.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Software Name</th>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4">Installed Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectPackage(pkg)}
                  >
                    {/* Name & Description */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors border border-slate-700/50">
                          <PackageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                            {pkg.displayName || pkg.name}
                            {pkg.homepage && (
                              <a
                                href={pkg.homepage}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-400 hover:text-slate-300"
                                title="Visit homepage"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {pkg.description && (
                            <p className="text-xs text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                              {pkg.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Manager */}
                    <td className="py-3.5 px-4">{getManagerBadge(pkg.manager, pkg.type)}</td>

                    {/* Version */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-200">
                      <span>{pkg.version}</span>
                    </td>

                    {/* Status & Update flag */}
                    <td className="py-3.5 px-4">
                      {pkg.updateAvailable ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          <span>v{pkg.latestVersion} available</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-500/10">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Up to date</span>
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 max-w-[200px] truncate" title={pkg.location}>
                      <div className="flex items-center gap-1.5">
                        <Folder className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{pkg.location}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {pkg.updateAvailable && (
                          <button
                            onClick={() => onUpdatePackage(pkg)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm transition-all"
                            title="Update package to latest version"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            <span>Update</span>
                          </button>
                        )}
                        <button
                          onClick={() => onReinstallPackage(pkg)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all"
                          title="Reinstall package"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onUninstallPackage(pkg)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700/60 transition-all"
                          title="Uninstall package"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectPackage(pkg)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all"
                          title="View Details"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
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
