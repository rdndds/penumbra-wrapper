import type { AppError, SerializedError } from '../../types';
import { ErrorCategory } from '../../types/errors';

/**
 * Parse errors from Tauri invoke calls into structured AppError format
 * Tauri may serialize errors in different ways depending on the error type
 */
export function parseTauriError(error: unknown): AppError {
  // Handle null/undefined
  if (error == null) {
    return {
      type: 'unknown',
      message: 'An unknown error occurred',
      category: ErrorCategory.Unknown,
    };
  }

  // Handle Error instances (JavaScript native errors)
  if (error instanceof Error) {
    return {
      type: 'other',
      message: error.message || 'An error occurred',
      category: ErrorCategory.Unknown,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: 'other',
      message: error,
      category: categorizeErrorString(error),
    };
  }

  // Handle object errors (Tauri's serialized format)
  if (typeof error === 'object') {
    const err = error as SerializedError;

    // Check if it's our structured error format with 'type' field
    if (typeof err.type === 'string') {
      return {
        type: err.type,
        message: err.message || 'An error occurred',
        category: parseCategory(err.category),
        suggestion: err.suggestion,
        code: err.code,
        output: err.output,
      };
    }

    // Handle plain object with message field
    if (typeof err.message === 'string') {
      return {
        type: 'other',
        message: err.message,
        category: categorizeErrorString(err.message),
      };
    }

    // Handle any other object by converting to string
    try {
      const message = JSON.stringify(error);
      return {
        type: 'other',
        message: message,
        category: ErrorCategory.Unknown,
      };
    } catch {
      return {
        type: 'other',
        message: 'An error occurred (details unavailable)',
        category: ErrorCategory.Unknown,
      };
    }
  }

  // Fallback for any other type
  return {
    type: 'unknown',
    message: String(error),
    category: ErrorCategory.Unknown,
  };
}

/**
 * Parse error category from string
 */
function parseCategory(category?: string): typeof ErrorCategory[keyof typeof ErrorCategory] {
  if (!category) return ErrorCategory.Unknown;
  
  const normalized = category.toLowerCase();
  switch (normalized) {
    case 'network':
      return ErrorCategory.Network;
    case 'permission':
      return ErrorCategory.Permission;
    case 'filesystem':
      return ErrorCategory.FileSystem;
    case 'validation':
      return ErrorCategory.Validation;
    case 'command':
      return ErrorCategory.Command;
    case 'update':
      return ErrorCategory.Update;
    default:
      return ErrorCategory.Unknown;
  }
}

/**
 * Categorize an error based on its message content
 */
function categorizeErrorString(message: string): typeof ErrorCategory[keyof typeof ErrorCategory] {
  const lowerMessage = message.toLowerCase();

  // Network-related errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('dns') ||
    lowerMessage.includes('github') ||
    lowerMessage.includes('download') ||
    lowerMessage.includes('fetch')
  ) {
    return ErrorCategory.Network;
  }

  // Permission-related errors
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('error code 5') ||
    lowerMessage.includes('error code 32') ||
    lowerMessage.includes('sharing violation') ||
    lowerMessage.includes('administrator')
  ) {
    return ErrorCategory.Permission;
  }

  // File system errors
  if (
    lowerMessage.includes('file') ||
    lowerMessage.includes('directory') ||
    lowerMessage.includes('path') ||
    lowerMessage.includes('not found') ||
    lowerMessage.includes('disk full') ||
    lowerMessage.includes('no space')
  ) {
    return ErrorCategory.FileSystem;
  }

  // Command errors
  if (
    lowerMessage.includes('command') ||
    lowerMessage.includes('execution') ||
    lowerMessage.includes('antumbra')
  ) {
    return ErrorCategory.Command;
  }

  // Update-specific errors
  if (
    lowerMessage.includes('update') ||
    lowerMessage.includes('checksum') ||
    lowerMessage.includes('hash') ||
    lowerMessage.includes('verification')
  ) {
    return ErrorCategory.Update;
  }

  return ErrorCategory.Unknown;
}

/**
 * Extract the most informative error message from any error type
 * This is useful for displaying to users
 */
export function extractErrorMessage(error: unknown): string {
  const parsed = parseTauriError(error);
  return parsed.message;
}

/**
 * Get user-friendly suggestion for an error
 */
export function getErrorSuggestion(error: unknown): string | undefined {
  const parsed = parseTauriError(error);
  
  // If the error has a suggestion, use it
  if (parsed.suggestion) {
    return parsed.suggestion;
  }

  // Otherwise, generate one based on category
  switch (parsed.category) {
    case ErrorCategory.Network:
      return 'Check your internet connection and try again';
    case ErrorCategory.Permission:
      return 'Run as Administrator or check folder permissions';
    case ErrorCategory.FileSystem:
      return 'Check that files and directories exist and are accessible';
    case ErrorCategory.Command:
      return 'Ensure required binaries are installed and accessible';
    case ErrorCategory.Update:
      return 'Try updating again or check for available updates';
    default:
      return undefined;
  }
}

/**
 * Check if an error is of a specific category
 */
export function isErrorCategory(
  error: unknown,
  category: typeof ErrorCategory[keyof typeof ErrorCategory]
): boolean {
  const parsed = parseTauriError(error);
  return parsed.category === category;
}
