import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { useOperationStore } from '../store/operationStore';

interface OperationOutputEvent {
  operation_id: string;
  line: string;
  timestamp: string;
  is_stderr: boolean;
}

interface OperationCompleteEvent {
  operation_id: string;
  success: boolean;
  error?: string;
}

export function useOperationStream() {
  const { addLog, finishOperation, setIsStreaming } = useOperationStore();

  useEffect(() => {
    let unlistenOutput: UnlistenFn | null = null;
    let unlistenComplete: UnlistenFn | null = null;
    let isMounted = true;

    const setupListeners = async () => {
      // Listen for operation output
      unlistenOutput = await listen<OperationOutputEvent>('operation:output', (event) => {
        if (!isMounted) return; // Guard against state updates after unmount
        
        const { line, timestamp, is_stderr } = event.payload;
        
        // Parse log level from line content
        let level: 'info' | 'success' | 'error' | 'warning' = is_stderr ? 'error' : 'info';
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('error') || lowerLine.includes('failed')) {
          level = 'error';
        } else if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
          level = 'warning';
        } else if (lowerLine.includes('success') || lowerLine.includes('complete') || lowerLine.includes('found')) {
          level = 'success';
        }

        addLog({
          timestamp,
          level,
          message: line,
        });
      });

      // Listen for operation completion
      unlistenComplete = await listen<OperationCompleteEvent>('operation:complete', (event) => {
        if (!isMounted) return; // Guard against state updates after unmount
        
        const { success, error } = event.payload;
        
        finishOperation(success, error);
        setIsStreaming(false);
      });
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      isMounted = false; // Set flag before cleanup
      if (unlistenOutput) {
        unlistenOutput();
      }
      if (unlistenComplete) {
        unlistenComplete();
      }
    };
  }, [addLog, finishOperation, setIsStreaming]);
}
