import React, { useState } from 'react';
import {
  X,
  Search,
  Download,
  Terminal,
  Shield,
  Boxes,
  RotateCw,
} from 'lucide-react';
import { PackageManagerType, Package } from '@stuff-manager/shared';
import { api } from '../../api/client';
import { useTerminal } from '../../context/TerminalContext';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const [manager, setManager] = useState<PackageManagerType>('brew');
  const [packageName, setPackageName] = useState('');
  const [isCask, setIsCask] = useState(false);
  const [forceTerminal, setForceTerminal] = useState(false);
  const [searchResults, setSearchResults] = useState<Package[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const { startJob } = useTerminal();

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!packageName.trim()) return;
    setIsSearching(true);
    setInstallError(null);
    try {
      const res = await api.searchPackages(packageName.trim(), manager);
      setSearchResults(res.results || []);
    } catch (err: any) {
      setSearchResults([]);
      setInstallError(err.message || 'Failed to search package repository.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstall = async (nameToInstall?: string) => {
    const targetName = nameToInstall || packageName.trim();
    if (!targetName) return;

    setIsInstalling(true);
    setInstallError(null);
    try {
      const res = await api.installPackage({
        manager,
        name: targetName,
        isCask: manager === 'brew' ? isCask : undefined,
        forceTerminalPrivilege: forceTerminal,
      });

      if (res.job) {
        startJob(res.job);
        onClose();
      }
    } catch (err: any) {
      setInstallError(err.message || 'Package installation failed to start.');
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-[#0c121e] border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden z-10 animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Install New Software</h3>
              <p className="text-xs text-slate-400">Discover and install packages without CLI commands</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Ecosystem Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Target Package Manager
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setManager('brew')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                  manager === 'brew'
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Homebrew</span>
              </button>
              <button
                type="button"
                onClick={() => setManager('npm')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                  manager === 'npm'
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>npm Global</span>
              </button>
              <button
                type="button"
                onClick={() => setManager('pip')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                  manager === 'pip'
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Python (pip)</span>
              </button>
            </div>
          </div>

          {/* Package Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Package / Formula Name
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. n8n, ffmpeg, ollama, postgres..."
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || !packageName.trim()}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSearching ? <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Options (Cask / Terminal Privilege) */}
          <div className="space-y-2 pt-1">
            {manager === 'brew' && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCask}
                  onChange={(e) => setIsCask(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                />
                <span>Install as macOS GUI Application (Cask --cask)</span>
              </label>
            )}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceTerminal}
                onChange={(e) => setForceTerminal(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
              />
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Run with Admin Permission in native macOS Terminal</span>
              </span>
            </label>
          </div>

          {/* Search Results Preview */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Search Results ({searchResults.length})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white font-mono">{item.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.installCommand}</div>
                    </div>
                    <button
                      onClick={() => handleInstall(item.name)}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>Install</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error message banner */}
          {installError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300 font-mono space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-red-400 font-sans">
                <span>Operation Error</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{installError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleInstall()}
            disabled={isInstalling || !packageName.trim()}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-primary transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isInstalling ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Install Package</span>
          </button>
        </div>
      </div>
    </div>
  );
};
