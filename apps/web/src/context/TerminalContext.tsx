import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { CommandStreamEvent, OperationLog, OperationStatus } from '@stuff-manager/shared';
import { useQueryClient } from '@tanstack/react-query';

interface TerminalContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeJob: OperationLog | null;
  output: string;
  jobStatus: OperationStatus | null;
  clearOutput: () => void;
  startJob: (job: OperationLog) => void;
  privilegedDialog: {
    isOpen: boolean;
    jobName: string;
    command: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
  setPrivilegedDialog: (val: any) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

export const TerminalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<OperationLog | null>(null);
  const [output, setOutput] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<OperationStatus | null>(null);
  const [privilegedDialog, setPrivilegedDialog] = useState<any>(null);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const connectWs = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const event: CommandStreamEvent = JSON.parse(e.data);
        if (event.type === 'stdout' || event.type === 'stderr') {
          setOutput((prev) => prev + event.data);
        } else if (event.type === 'status') {
          if (event.status) setJobStatus(event.status);
        } else if (event.type === 'exit') {
          if (event.status) setJobStatus(event.status);
          setOutput((prev) => prev + `\n${event.data}\n`);
          // Re-fetch packages and overview when an operation completes
          queryClient.invalidateQueries({ queryKey: ['packages'] });
          queryClient.invalidateQueries({ queryKey: ['overview'] });
          queryClient.invalidateQueries({ queryKey: ['history'] });
          queryClient.invalidateQueries({ queryKey: ['doctor'] });
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      setTimeout(connectWs, 3000);
    };
  }, [queryClient]);

  useEffect(() => {
    connectWs();
    return () => {
      wsRef.current?.close();
    };
  }, [connectWs]);

  const clearOutput = () => {
    setOutput('');
  };

  const startJob = (job: OperationLog) => {
    setActiveJob(job);
    setJobStatus('running');
    setOutput(job.output || `$ ${job.command}\n\n`);
    setIsOpen(true);
  };

  return (
    <TerminalContext.Provider
      value={{
        isOpen,
        setIsOpen,
        activeJob,
        output,
        jobStatus,
        clearOutput,
        startJob,
        privilegedDialog,
        setPrivilegedDialog,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (!context) throw new Error('useTerminal must be used within a TerminalProvider');
  return context;
};
