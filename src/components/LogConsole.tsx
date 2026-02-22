import { useEffect, useRef } from 'react';
import type { LogEvent } from '../types';

interface LogConsoleProps {
  logs: LogEvent[];
  className?: string;
}

export function LogConsole({ logs, className = '' }: LogConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-[var(--danger)]';
      case 'warn':
      case 'warning':
        return 'text-yellow-400';
      case 'success':
        return 'text-[var(--success)]';
      case 'info':
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] ${className}`}>
      <div className="border-b border-[var(--border)] px-4 py-2">
        <h3 className="text-sm font-medium text-[var(--text-muted)]">Console Output</h3>
      </div>
      <div
        ref={consoleRef}
        className="h-64 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-[var(--text-subtle)]">No output yet...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id || log.timestamp} className={`${getLogColor(log.level)} mb-1`}>
              <span className="text-[var(--text-subtle)]">[{log.timestamp}]</span>{' '}
              <span className="text-[var(--text-muted)]">{log.level}:</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
