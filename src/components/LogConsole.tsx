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
        return 'text-red-400';
      case 'warn':
      case 'warning':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      case 'info':
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-950 ${className}`}>
      <div className="border-b border-zinc-800 px-4 py-2">
        <h3 className="text-sm font-medium text-zinc-400">Console Output</h3>
      </div>
      <div
        ref={consoleRef}
        className="h-64 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-zinc-600">No output yet...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id || log.timestamp} className={`${getLogColor(log.level)} mb-1`}>
              <span className="text-zinc-600">[{log.timestamp}]</span>{' '}
              <span className="text-zinc-500">{log.level}:</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
