import React, { useRef, useEffect } from 'react';
import {
  Terminal,
  X,
  Trash2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';

export const LiveTerminalDrawer: React.FC = () => {
  const { isOpen, setIsOpen, activeJob, output, jobStatus, clearOutput } = useTerminal();
  const [copied, setCopied] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const scrollRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (jobStatus) {
      case 'running':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            Executing
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`fixed bottom-0 right-0 left-0 md:left-64 z-40 bg-[#06090e] border-t border-slate-800 shadow-2xl transition-all flex flex-col ${
        isExpanded ? 'h-[75vh]' : 'h-80'
      }`}
    >
      {/* Header Bar */}
      <div className="h-11 px-4 bg-[#0a0f1a] border-b border-slate-800/80 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 font-semibold pl-2 border-l border-slate-800">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>PACKAGE GUI Live Command Stream</span>
            {activeJob && (
              <span className="text-slate-400 font-normal">({activeJob.action} {activeJob.packageName})</span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={clearOutput}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-4 overflow-hidden relative">
        <pre
          ref={scrollRef}
          className="w-full h-full font-mono text-xs text-slate-200 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed font-normal"
        >
          {output || 'Waiting for command execution logs...\n'}
        </pre>
      </div>
    </div>
  );
};
