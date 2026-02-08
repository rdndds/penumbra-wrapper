/**
 * Windows-specific error handling utilities
 * Provides detailed error messages for common Windows issues
 */

export class WindowsErrorHandler {
  /**
   * Get Windows-specific error suggestion based on error message
   */
  static getErrorSuggestion(error: string): string {
    const lowerError = error.toLowerCase();
    
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
    
    return `Download antumbra update failed: ${error}`;
  }
  
  /**
   * Check if error is likely Windows-specific
   */
  static isWindowsError(error: string): boolean {
    const lowerError = error.toLowerCase();
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
   */
  static getTroubleshootingSteps(error: string): string[] {
    const lowerError = error.toLowerCase();
    const steps: string[] = [];
    
    if (lowerError.includes('file in use') || lowerError.includes('sharing violation')) {
      steps.push('Close any running instances of antumbra.exe');
      steps.push('Check Task Manager for antumbra.exe processes');
      steps.push('Try updating again after closing all instances');
    }
    
    if (lowerError.includes('access denied') || lowerError.includes('permission')) {
      steps.push('Run PenumbraWrapper as Administrator');
      steps.push('Check if antivirus software is blocking the application');
      steps.push('Add PenumbraWrapper to antivirus exceptions list');
    }
    
    if (lowerError.includes('network') || lowerError.includes('github')) {
      steps.push('Check your internet connection');
      steps.push('Try disabling VPN temporarily');
      steps.push('Check Windows Firewall settings');
      steps.push('Try updating again in a few minutes');
    }
    
    if (lowerError.includes('disk full')) {
      steps.push('Check available disk space');
      steps.push('Clean up temporary files');
      steps.push('Free up space on your system drive');
    }
    
    return steps;
  }
}