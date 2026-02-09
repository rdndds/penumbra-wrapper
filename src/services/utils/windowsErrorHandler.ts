/**
 * Windows-specific error handling utilities
 * Provides detailed error messages for common Windows issues
 * Now integrated with structured error types from backend
 */

import { ErrorCategory } from '../../types';
import { parseTauriError } from './errorParser';

export class WindowsErrorHandler {
  /**
   * Get Windows-specific error suggestion based on error
   * Accepts both structured AppError and legacy string errors
   */
  static getErrorSuggestion(error: unknown): string {
    // Parse the error into structured format
    const err = parseTauriError(error);
    
    if (err.suggestion) {
      return err.suggestion;
    }

    // Use category for better suggestions
    switch (err.category) {
      case ErrorCategory.Permission:
        return 'Permission denied. Run as Administrator or check your antivirus software.';
      case ErrorCategory.Network:
        return 'Network error. Check your internet connection and try again.';
      case ErrorCategory.FileSystem:
        return 'File system error. Check file permissions and disk space.';
      case ErrorCategory.Update:
        return 'Update failed. Try again or check for available updates.';
      default:
        break;
    }

    // Fall back to string matching for legacy errors
    const lowerError = err.message?.toLowerCase() || '';
    
    // File sharing violation - file is in use
    if (lowerError.includes('sharing violation') || 
        lowerError.includes('file in use') ||
        lowerError.includes('being used by another process')) {
      return 'antumbra.exe is currently running. Please close it and try again.';
    }
    
    // Access denied - permissions or security software
    if (lowerError.includes('access denied') || 
        lowerError.includes('permission denied')) {
      return 'Permission denied. Run as Administrator or check your antivirus software.';
    }
    
    // Disk space issues
    if (lowerError.includes('disk full') || 
        lowerError.includes('insufficient disk space') ||
        lowerError.includes('no space left on device')) {
      return 'Insufficient disk space. Free up space and retry.';
    }
    
    // Path not found
    if (lowerError.includes('path not found') || 
        lowerError.includes('file not found') ||
        lowerError.includes('the system cannot find the path specified')) {
      return 'antumbra.exe not found. Check your installation path.';
    }
    
    // Network issues
    if (lowerError.includes('network') || 
        lowerError.includes('connection') ||
        lowerError.includes('timeout') ||
        lowerError.includes('dns')) {
      return 'Network error. Check your internet connection and try again.';
    }
    
    // Checksum mismatch
    if (lowerError.includes('checksum') || 
        lowerError.includes('hash') ||
        lowerError.includes('verification failed')) {
      return 'Download verification failed. The file may be corrupted. Try downloading again.';
    }
    
    // API/HTTP errors
    if (lowerError.includes('api') || 
        lowerError.includes('github') ||
        lowerError.includes('404') ||
        lowerError.includes('rate limit')) {
      return 'Failed to connect to GitHub. Check your internet connection or try again later.';
    }
    
    // Generic Windows error codes
    if (lowerError.includes('error code 32')) {
      return 'File is in use by another program. Close antumbra.exe and try again.';
    }
    
    if (lowerError.includes('error code 5')) {
      return 'Access denied. Run as Administrator or add exception in antivirus software.';
    }
    
    return `Download antumbra update failed: ${err.message || error}`;
  }
  
  /**
   * Check if error is likely Windows-specific
   * Now uses error category for better detection
   */
  static isWindowsError(error: unknown): boolean {
    const err = parseTauriError(error);
    
    // Check category first
    if (err.category === ErrorCategory.Permission ||
        err.category === ErrorCategory.FileSystem) {
      return true;
    }
    
    // Fall back to string matching
    const lowerError = err.message?.toLowerCase() || '';
    return (
      lowerError.includes('sharing violation') ||
      lowerError.includes('access denied') ||
      lowerError.includes('file in use') ||
      lowerError.includes('error code') ||
      lowerError.includes('disk full') ||
      lowerError.includes('permission denied') ||
      lowerError.includes('path not found') ||
      lowerError.includes('antumbra.exe')
    );
  }
  
  /**
   * Get troubleshooting steps for common Windows issues
   * Enhanced with error category awareness
   */
  static getTroubleshootingSteps(error: unknown): string[] {
    const err = parseTauriError(error);
    const steps: string[] = [];
    const lowerError = err.message?.toLowerCase() || '';
    
    // Use error category for better step suggestions
    if (err.category === ErrorCategory.Permission ||
        lowerError.includes('file in use') || 
        lowerError.includes('sharing violation') ||
        lowerError.includes('error code 32')) {
      steps.push('Close any running instances of antumbra.exe');
      steps.push('Check Task Manager for antumbra.exe processes');
      steps.push('Try updating again after closing all instances');
    }
    
    if (err.category === ErrorCategory.Permission ||
        lowerError.includes('access denied') || 
        lowerError.includes('permission') ||
        lowerError.includes('error code 5')) {
      steps.push('Run PenumbraWrapper as Administrator');
      steps.push('Check if antivirus software is blocking the application');
      steps.push('Add PenumbraWrapper to antivirus exceptions list');
    }
    
    if (err.category === ErrorCategory.Network ||
        lowerError.includes('network') || 
        lowerError.includes('github')) {
      steps.push('Check your internet connection');
      steps.push('Try disabling VPN temporarily');
      steps.push('Check Windows Firewall settings');
      steps.push('Try updating again in a few minutes');
    }
    
    if (err.category === ErrorCategory.FileSystem ||
        lowerError.includes('disk full')) {
      steps.push('Check available disk space');
      steps.push('Clean up temporary files');
      steps.push('Free up space on your system drive');
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
