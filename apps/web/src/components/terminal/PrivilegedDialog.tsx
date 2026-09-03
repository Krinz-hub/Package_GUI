import React from 'react';
import { ShieldAlert, Terminal, CheckCircle2, X } from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';

export const PrivilegedDialog: React.FC = () => {
  const { privilegedDialog, setPrivilegedDialog } = useTerminal();

  if (!privilegedDialog || !privilegedDialog.isOpen) return null;

  const { jobName, command, onConfirm, onCancel } = privilegedDialog;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setPrivilegedDialog(null)} />

      {/* Dialog Box */}
      <div className="relative bg-[#0c121e] border border-amber-500/40 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden z-10 animate-fade-in">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-glow-primary">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Administrator Permission Required</h3>
            <p className="text-xs text-slate-400 mt-1">
              macOS requires administrator permissions to complete this operation safely.
            </p>
          </div>

          {/* Explanation Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Native macOS Terminal Flow</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              A macOS Terminal window will open automatically. You will enter your administrator password directly into Terminal.
            </p>
            <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-amber-300 truncate">
              $ {command}
            </div>
          </div>

          <div className="text-[11px] text-emerald-400/90 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PACKAGE GUI never sees, asks for, or stores passwords.</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                onCancel();
                setPrivilegedDialog(null);
              }}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                setPrivilegedDialog(null);
              }}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-glow-primary transition-all"
            >
              Continue in Terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
