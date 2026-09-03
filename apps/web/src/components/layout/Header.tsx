import React from 'react';
import { Search, RefreshCw, Plus, Terminal, Shield } from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenInstallModal: () => void;
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
  onOpenInstallModal,
  title,
  subtitle,
}) => {
  const { isOpen, setIsOpen, jobStatus } = useTerminal();
  const isJobRunning = jobStatus === 'running';

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0c121e]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Title & context */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {/* Global Search & Actions */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search packages, formulae, CLI tools..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-1.5 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition-all font-sans"
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh package states"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Live Terminal Drawer toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
            isJobRunning
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-glow-primary'
              : isOpen
              ? 'bg-slate-800 text-slate-200 border-slate-700'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Live Logs</span>
          {isJobRunning && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>}
        </button>

        {/* Install button */}
        <button
          onClick={onOpenInstallModal}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-primary transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Install Software</span>
        </button>
      </div>
    </header>
  );
};
