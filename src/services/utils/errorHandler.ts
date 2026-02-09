import toast from 'react-hot-toast';
import { useOperationStore } from '../../store/operationStore';
import { parseTauriError, getErrorSuggestion } from './errorParser';
import type { AppError } from '../../types';

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
  /** Whether to include error suggestion in the toast message */
  showSuggestion?: boolean;
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
   * @param error - The error object or message from Tauri invoke
   * @param operation - Name of the operation that failed (e.g., "Connect", "Read partition")
   * @param options - Optional configuration for error handling behavior
   * @returns The parsed AppError for potential further processing
   */
  static handle(
    error: unknown,
    operation: string,
    options: ErrorOptions = {}
  ): AppError {
    const {
      showToast = true,
      logToConsole = true,
      addToOperationLog = true,
      customMessage,
      showSuggestion = true,
    } = options;

    // Parse the error into structured format
    const parsedError = parseTauriError(error);
    
    // Build the display message
    let errorMessage = customMessage || parsedError.message;
    
    // Add suggestion if enabled and available
    const suggestion = showSuggestion ? (parsedError.suggestion || getErrorSuggestion(error)) : undefined;
    const displayMessage = suggestion 
      ? `${errorMessage}\n\n💡 ${suggestion}`
      : errorMessage;

    if (logToConsole) {
      console.error(`[${operation}] Error:`, error);
      console.error(`[${operation}] Parsed:`, parsedError);
    }

    if (showToast) {
      toast.error(displayMessage, {
        duration: suggestion ? 6000 : 4000, // Show longer if there's a suggestion
      });
    }

    if (addToOperationLog) {
      useOperationStore.getState().addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `[${operation}] ${errorMessage}`,
      });
      
      // Also log suggestion to operation log if available
      if (suggestion) {
        useOperationStore.getState().addLog({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `💡 Suggestion: ${suggestion}`,
        });
      }
    }

    return parsedError;
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

  /**
   * Handle informational messages.
   * Displays info toast and adds to operation log.
   * 
   * @param operation - Name of the operation
   * @param message - The info message
   * @param showToast - Whether to show a toast notification (default: true)
   */
  static info(
    operation: string,
    message: string,
    showToast: boolean = false
  ): void {
    if (showToast) {
      toast(message, { icon: 'ℹ️' });
    }

    useOperationStore.getState().addLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[${operation}] ${message}`,
    });
  }

  /**
   * Handle warnings.
   * Displays warning toast and adds to operation log.
   * 
   * @param operation - Name of the operation
   * @param message - The warning message
   * @param showToast - Whether to show a toast notification (default: true)
   */
  static warn(
    operation: string,
    message: string,
    showToast: boolean = true
  ): void {
    if (showToast) {
      toast(message, { icon: '⚠️' });
    }

    useOperationStore.getState().addLog({
      timestamp: new Date().toISOString(),
      level: 'warning',
      message: `[${operation}] ${message}`,
    });
  }
}

// Re-export error parsing utilities for convenience
export { parseTauriError, getErrorSuggestion };
export type { AppError };
