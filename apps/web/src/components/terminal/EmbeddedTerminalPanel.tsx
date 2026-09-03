import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  Terminal as TerminalIcon,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  Radio,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface EmbeddedTerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
  shellName?: string;
}

export const EmbeddedTerminalPanel: React.FC<EmbeddedTerminalPanelProps> = ({
  isOpen,
  onClose,
  shellName = 'zsh',
}) => {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [height, setHeight] = useState<number>(340);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Initialize XTerm
    if (!xtermInstance.current && terminalRef.current) {
      const term = new XTerm({
        theme: {
          background: '#06090e',
          foreground: '#e2e8f0',
          cursor: '#38bdf8',
          selectionBackground: 'rgba(56, 189, 248, 0.3)',
          black: '#0f172a',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f8fafc',
        },
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        lineHeight: 1.25,
        cursorBlink: true,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      xtermInstance.current = term;
      fitAddonRef.current = fitAddon;

      // Connect to WebSocket /ws/terminal
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws/terminal`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'output' && msg.data) {
            term.write(msg.data);
          } else if (msg.type === 'status') {
            if (msg.data) term.write(`\x1b[36m${msg.data}\x1b[0m`);
          }
        } catch (_) {
          term.write(e.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        term.write('\r\n\x1b[31m[Terminal session disconnected]\x1b[0m\r\n');
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });
    }

    const handleResize = () => {
      fitAddonRef.current?.fit();
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Clean up terminal on close
  useEffect(() => {
    if (!isOpen) {
      wsRef.current?.close();
      wsRef.current = null;
      xtermInstance.current?.dispose();
      xtermInstance.current = null;
      setIsConnected(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    xtermInstance.current?.clear();
  };

  return (
    <div
      style={{ height: isMaximized ? '85vh' : `${height}px` }}
      className="fixed bottom-0 right-0 left-0 md:left-64 z-50 bg-[#06090e] border-t border-slate-800 shadow-2xl transition-all flex flex-col"
    >
      {/* Resizing Handle */}
      <div
        className="h-1 bg-slate-800/80 hover:bg-blue-500 cursor-ns-resize transition-colors"
        onMouseDown={(e) => {
          const startY = e.clientY;
          const startHeight = height;
          const onMouseMove = (moveEvent: MouseEvent) => {
            const newHeight = Math.max(200, Math.min(window.innerHeight - 100, startHeight - (moveEvent.clientY - startY)));
            setHeight(newHeight);
          };
          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            fitAddonRef.current?.fit();
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
      />

      {/* Header Bar */}
      <div className="h-11 px-4 bg-[#0a0f1a] border-b border-slate-800/80 flex items-center justify-between select-none flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-white font-semibold pl-2 border-l border-slate-800">
            <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>TERMINAL</span>
            <span className="text-slate-400 font-normal">({shellName})</span>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setIsMaximized(!isMaximized);
              setTimeout(() => fitAddonRef.current?.fit(), 50);
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={isMaximized ? 'Restore height' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close terminal panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal View Container */}
      <div className="flex-1 p-3 overflow-hidden bg-[#06090e]">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
