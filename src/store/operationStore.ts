import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { FlashProgress, LogEvent, OperationType } from '../types';

// Maximum number of log entries to keep in memory
const MAX_LOGS = 10000;

interface OperationState {
  // Current operation
  type: OperationType;
  partitionName: string | null;
  partitionSize: string | null;
  isRunning: boolean;
  operationId: string | null;
  isStreaming: boolean;
  startTime: number | null;
  
  // Logs & Progress
  logs: LogEvent[];
  progress: FlashProgress | null;
  error: string | null;
  
  // Actions
  startOperation: (
    type: 'read' | 'write',
    partitionName: string,
    partitionSize?: string,
    operationId?: string
  ) => void;
  setOperationId: (operationId: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  updateProgress: (progress: FlashProgress) => void;
  addLog: (log: LogEvent) => void;
  clearLogs: () => void;
  finishOperation: (success: boolean, error?: string) => void;
  clearOperation: () => void;
}

export const useOperationStore = create<OperationState>((set, get) => ({
  // Current operation
  type: null,
  partitionName: null,
  partitionSize: null,
  isRunning: false,
  operationId: null,
  isStreaming: false,
  startTime: null,
  
  // Logs & Progress
  logs: [],
  progress: null,
  error: null,
  
  // Actions
  startOperation: (type, partitionName, partitionSize, operationId) => {
    const state = get();
    set({
      type,
      partitionName,
      partitionSize: partitionSize || null,
      isRunning: true,
      progress: null,
      logs: state.logs, // Preserve existing logs
      error: null,
      operationId: operationId || null,
      isStreaming: !!operationId,
      startTime: Date.now(),
    });
  },
  
  setOperationId: (operationId) => set({
    operationId,
    isStreaming: true,
  }),
  
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  
  updateProgress: (progress) => set({ progress }),
  
  addLog: (log) => {
    const logs = get().logs;
    
    // Deduplication: Check if the last log is identical
    if (logs.length > 0) {
      const lastLog = logs[logs.length - 1];
      if (
        lastLog.message === log.message &&
        Math.abs(new Date(log.timestamp).getTime() - new Date(lastLog.timestamp).getTime()) < 500
      ) {
        return; // Skip duplicate
      }
    }
    
    // Add new log
    const newLog = {
      ...log,
      id: log.id || uuidv4(),
    };
    const newLogs = [...logs, newLog];
    
    // Enforce maximum log size to prevent memory leaks
    if (newLogs.length > MAX_LOGS) {
      // Remove oldest logs (from the beginning)
      newLogs.splice(0, newLogs.length - MAX_LOGS);
    }
    
    set({ logs: newLogs });
  },
  
  clearLogs: () => set({ logs: [] }),
  
  finishOperation: (_success, error) => set({
    isRunning: false,
    error: error || null,
    isStreaming: false,
  }),
  
  clearOperation: () => set({
    type: null,
    partitionName: null,
    partitionSize: null,
    isRunning: false,
    progress: null,
    logs: [],
    error: null,
    operationId: null,
    isStreaming: false,
    startTime: null,
  }),
}));
