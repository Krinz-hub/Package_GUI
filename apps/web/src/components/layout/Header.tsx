import React from 'react';
import { Search, RefreshCw, Plus, Terminal as TerminalIcon, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenInstallModal: () => void;
  isTerminalPanelOpen: boolean;
  onToggleTerminalPanel: () => void;
  title: string;
  subtitle?: string;
  isBackendConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
  onOpenInstallModal,
  isTerminalPanelOpen,
  onToggleTerminalPanel,
  title,
  subtitle,
  isBackendConnected,
}) => {
  const { isOpen: isLogsOpen, setIsOpen: setIsLogsOpen, jobStatus } = useTerminal();
  const isJobRunning = jobStatus === 'running';

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0c121e]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Title & connection badge */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
            {/* Live Backend Connection Status Indicator */}
            {isBackendConnected ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Backend Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                <AlertCircle className="w-3 h-3 text-red-400" />
                Backend Disconnected
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>

      {/* Global Search & Action Controls */}
      <div className="flex items-center gap-3">
        {/* Global Search bar (Packages, Ports, Processes, Services) */}
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search software, ports, PIDs, processes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 text-sm rounded-lg pl-9 pr-4 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition-all font-sans"
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh package states, processes, and ports"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* 1. Live Operation Logs Toggle */}
        <button
          onClick={() => setIsLogsOpen(!isLogsOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
            isJobRunning
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-glow-primary'
              : isLogsOpen
              ? 'bg-slate-800 text-slate-200 border-slate-700'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
          }`}
          title="Toggle live package execution output logs"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Live Logs</span>
          {isJobRunning && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
        </button>

        {/* 2. Interactive Terminal Panel Toggle */}
        <button
          onClick={onToggleTerminalPanel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
            isTerminalPanelOpen
              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-glow-success'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
          }`}
          title="Toggle embedded interactive shell terminal"
        >
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Terminal</span>
        </button>

        {/* 3. Install Software button */}
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
