import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Terminal, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore } from '../store/uiStore';
import { useOperationStore } from '../store/operationStore';
import { ProgressWidget } from './ProgressWidget';
import { ErrorHandler } from '../services/utils/errorHandler';

export function LogPanel() {
  const { isLogPanelOpen, closeLogPanel, logPanelWidth, setLogPanelWidth } = useUIStore();
  // Select only needed properties from operation store to prevent unnecessary re-renders
  const logs = useOperationStore((state) => state.logs);
  const isStreaming = useOperationStore((state) => state.isStreaming);
  const isRunning = useOperationStore((state) => state.isRunning);
  const type = useOperationStore((state) => state.type);
  const partitionName = useOperationStore((state) => state.partitionName);
  const partitionSize = useOperationStore((state) => state.partitionSize);
  const startTime = useOperationStore((state) => state.startTime);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Load saved width or use default (40vw)
  const [isDragging, setIsDragging] = useState(false);
  const panelWidthRef = useRef(logPanelWidth);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!isLogPanelOpen) return; // Don't scroll if panel is closed
    
    const scrollTimeout = setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100); // Small delay to prevent overlapping scrolls

    return () => clearTimeout(scrollTimeout);
  }, [logs, isLogPanelOpen]);

  const handleCopyLogs = useCallback(async () => {
    if (logs.length === 0) {
      toast.error('No logs to copy');
      return;
    }

    try {
      const logsText = logs
        .map((log) => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          return `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
        })
        .join('\n');

      await navigator.clipboard.writeText(logsText);
      toast.success('Logs copied to clipboard');
    } catch (error) {
      ErrorHandler.handle(error, 'Copy logs', {
        customMessage: 'Failed to copy logs',
        addToOperationLog: false,
      });
    }
  }, [logs]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Escape to close panel
    if (e.key === 'Escape' && isLogPanelOpen) {
      closeLogPanel();
    }
    
    // Ctrl+C to copy logs (only when panel is open)
    if (e.ctrlKey && e.key === 'c' && isLogPanelOpen && !window.getSelection()?.toString()) {
      e.preventDefault();
      handleCopyLogs();
    }
  }, [isLogPanelOpen, closeLogPanel, handleCopyLogs]);

  // Keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle resize drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.9;
      const clamped = Math.min(Math.max(newWidth, minWidth), maxWidth);
      
      // Update DOM directly - no React re-render during drag!
      if (panelRef.current) {
        panelRef.current.style.width = `${clamped}px`;
      }
      panelWidthRef.current = clamped;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Update store when drag ends
      setLogPanelWidth(panelWidthRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setLogPanelWidth]);

  if (!isLogPanelOpen) return null;

  const getLevelColor = (level: string) => {
    if (!level) return 'text-[var(--text-muted)]';
    
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-[var(--danger)]';
      case 'warning':
        return 'text-[var(--warning)]';
      case 'success':
        return 'text-[var(--success)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
        onClick={closeLogPanel}
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full bg-[var(--surface)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl ${isDragging ? '' : 'transition-all duration-300 ease-out'}`}
        style={{ width: `${logPanelWidth}px` }}
      >
        {/* Resize Handle - Small centered grip */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-16 w-3 cursor-col-resize bg-[var(--primary-soft)] hover:bg-[var(--primary)] rounded-r-md transition-colors flex items-center justify-center"
          onMouseDown={() => setIsDragging(true)}
          title="Drag to resize"
        >
          {/* Grip indicator */}
          <div className="w-0.5 h-8 bg-[var(--primary-foreground)]/60 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] ml-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Operation Logs
            </h2>
            {isStreaming && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--success-soft)] rounded-full border border-[var(--success)]">
                <div className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
                <span className="text-xs text-[var(--success)] font-medium">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className="p-1 hover:bg-[var(--surface-alt)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy logs"
            >
              <Copy className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <button
              onClick={closeLogPanel}
              className="p-1 hover:bg-[var(--surface-alt)] rounded transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Progress Widget - Shows operation status when running */}
        <ProgressWidget 
          isActive={isRunning}
          operationType={type}
          partitionName={partitionName}
          partitionSize={partitionSize || undefined}
          startTime={startTime}
        />

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 ml-2">
          {logs.length === 0 ? (
            <div className="text-center text-[var(--text-subtle)] mt-8">
              No logs yet
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id || log.timestamp} className="flex gap-2">
                <span className="text-[var(--text-subtle)] shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={getLevelColor(log.level)}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="text-[var(--text)] break-all">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </>
  );
}
