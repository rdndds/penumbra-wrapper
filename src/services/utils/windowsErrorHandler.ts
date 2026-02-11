/**
 * Windows-specific error handling utilities
 * Provides detailed error messages for common Windows issues
 * Now integrated with structured error types from backend
 */

import { ErrorCategory } from '../../types';
import { parseTauriError } from './errorParser';

const CATEGORY_SUGGESTIONS: Partial<Record<ErrorCategory, string>> = {
  [ErrorCategory.Permission]:
    'Permission denied. Run as Administrator or check your antivirus software.',
  [ErrorCategory.Network]:
    'Network error. Check your internet connection and try again.',
  [ErrorCategory.FileSystem]:
    'File system error. Check file permissions and disk space.',
  [ErrorCategory.Update]:
    'Update failed. Try again or check for available updates.',
};

const TROUBLESHOOTING_RULES: Array<{
  category: ErrorCategory[];
  steps: string[];
}> = [
  {
    category: [ErrorCategory.Permission],
    steps: [
      'Close any running instances of antumbra.exe',
      'Check Task Manager for antumbra.exe processes',
      'Try updating again after closing all instances',
    ],
  },
  {
    category: [ErrorCategory.Permission],
    steps: [
      'Run PenumbraWrapper as Administrator',
      'Check if antivirus software is blocking the application',
      'Add PenumbraWrapper to antivirus exceptions list',
    ],
  },
  {
    category: [ErrorCategory.Network],
    steps: [
      'Check your internet connection',
      'Try disabling VPN temporarily',
      'Check Windows Firewall settings',
      'Try updating again in a few minutes',
    ],
  },
  {
    category: [ErrorCategory.FileSystem],
    steps: [
      'Check available disk space',
      'Clean up temporary files',
      'Free up space on your system drive',
    ],
  },
];

export class WindowsErrorHandler {
  /**
   * Get Windows-specific error suggestion based on error
   * Accepts both structured AppError and legacy string errors
   */
  static getErrorSuggestion(error: unknown): string {
    // Parse the error into structured format
    const err = parseTauriError(error);
    const category = err.category ?? ErrorCategory.Unknown;
    
    if (err.suggestion) {
      return err.suggestion;
    }

    // Use category for better suggestions
    const categorySuggestion = CATEGORY_SUGGESTIONS[category];
    if (categorySuggestion) {
      return categorySuggestion;
    }

    return `Download antumbra update failed: ${err.message || error}`;
  }
  
  /**
   * Check if error is likely Windows-specific
   * Now uses error category for better detection
   */
  static isWindowsError(error: unknown): boolean {
    const err = parseTauriError(error);
    const category = err.category ?? ErrorCategory.Unknown;
    
    // Check category first
    if (category === ErrorCategory.Permission || category === ErrorCategory.FileSystem) {
      return true;
    }

    return false;
  }
  
  /**
   * Get troubleshooting steps for common Windows issues
   * Enhanced with error category awareness
   */
  static getTroubleshootingSteps(error: unknown): string[] {
    const err = parseTauriError(error);
    const category = err.category ?? ErrorCategory.Unknown;
    const steps: string[] = [];

    for (const rule of TROUBLESHOOTING_RULES) {
      if (rule.category.includes(category)) {
        steps.push(...rule.steps);
      }
    }
    
    return steps;
  }

  /**
   * Format error for display with suggestion
   */
  static formatErrorWithSuggestion(error: unknown): string {
    const err = parseTauriError(error);
    const suggestion = this.getErrorSuggestion(err);
    
    if (suggestion && suggestion !== err.message) {
      return `${err.message}\n\n💡 ${suggestion}`;
    }
    
    return err.message || String(error);
  }
}
