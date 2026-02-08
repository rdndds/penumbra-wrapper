import toast from 'react-hot-toast';
import { useOperationStore } from '../../store/operationStore';

/**
 * Options for error handling behavior.
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
 * Error Handler Service - Provides consistent error and success handling.
 * Centralizes toast notifications, console logging, and operation log management.
 */
export class ErrorHandler {
  /**
   * Handle errors consistently across the application.
   * Displays toast notifications, logs to console, and adds to operation log.
   * 
   * @param error - The error object or message
   * @param operation - Name of the operation that failed (e.g., "Connect", "Read partition")
   * @param options - Optional configuration for error handling behavior
   */
  static handle(
    error: unknown,
    operation: string,
    options: ErrorOptions = {}
  ): void {
    const {
      showToast = true,
      logToConsole = true,
      addToOperationLog = true,
      customMessage,
    } = options;

    const errorMessage =
      error instanceof Error
        ? error.message
        : customMessage || `${operation} failed`;

    if (logToConsole) {
      console.error(`[${operation}] Error:`, error);
    }

    if (showToast) {
      toast.error(errorMessage);
    }

    if (addToOperationLog) {
      useOperationStore.getState().addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: errorMessage,
      });
    }
  }

  /**
   * Handle successful operations consistently.
   * Displays success toast and adds to operation log.
   * 
   * @param operation - Name of the successful operation
   * @param message - Optional custom success message
   * @param showToast - Whether to show a toast notification (default: true)
   */
  static success(
    operation: string,
    message?: string,
    showToast: boolean = true
  ): void {
    const successMessage = message || `${operation} completed successfully`;

    if (showToast) {
      toast.success(successMessage);
    }

    useOperationStore.getState().addLog({
      timestamp: new Date().toISOString(),
      level: 'success',
      message: successMessage,
    });
  }
}
