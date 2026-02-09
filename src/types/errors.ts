/**
 * Error categories for classification and user guidance
 * Using const object instead of enum due to erasableSyntaxOnly setting
 */
export const ErrorCategory = {
  Network: 'network',
  Permission: 'permission',
  FileSystem: 'filesystem',
  Validation: 'validation',
  Command: 'command',
  Update: 'update',
  Unknown: 'unknown',
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

/**
 * Structured application error from Rust backend
 */
export interface AppError {
  /** Error type variant */
  type: string;
  /** Human-readable error message */
  message: string;
  /** Error category for classification */
  category?: ErrorCategory;
  /** User-friendly suggestion for resolving the error */
  suggestion?: string;
  /** OS-specific error code (if applicable) */
  code?: number;
  /** Command output (for command errors) */
  output?: string;
}

/**
 * Tauri's serialized error format
 * Errors from Tauri invoke may come in various formats
 */
export interface SerializedError {
  type?: string;
  message?: string;
  category?: string;
  suggestion?: string;
  code?: number;
  output?: string;
  [key: string]: unknown;
}

/**
 * Error handling options
 */
export interface ErrorOptions {
  /** Whether to show a toast notification */
  showToast?: boolean;
  /** Whether to log error to browser console */
  logToConsole?: boolean;
  /** Whether to add error to operation log panel */
  addToOperationLog?: boolean;
  /** Custom error message to display */
  customMessage?: string;
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  
  const err = error as Record<string, unknown>;
  return (
    typeof err.type === 'string' &&
    typeof err.message === 'string'
  );
}

/**
 * Common error type strings from backend
 */
export const ErrorType = {
  Io: 'io',
  Command: 'command',
  DeviceNotConnected: 'device_not_connected',
  Cancelled: 'cancelled',
  InvalidPartition: 'invalid_partition',
  Parse: 'parse',
  Update: 'update',
  Other: 'other',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];
