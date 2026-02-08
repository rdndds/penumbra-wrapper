/**
 * Format Utilities - Functions for formatting bytes, hex values, and timestamps.
 */

/**
 * Format bytes to human-readable string with appropriate unit.
 * 
 * @param bytes - Number of bytes to format
 * @returns Formatted string (e.g., "1.50 MB", "256 KB")
 * @example
 * formatBytes(1024) // "1.00 KB"
 * formatBytes(1536000) // "1.46 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format hexadecimal size string to human-readable byte string.
 * Converts hex string (e.g., "0x400000") to formatted bytes (e.g., "4.00 MB").
 * 
 * @param hexSize - Hexadecimal size string (with or without "0x" prefix)
 * @returns Formatted byte string, or original string if parsing fails
 * @example
 * formatHexSize("0x400000") // "4.00 MB"
 * formatHexSize("100000") // "1.00 MB"
 */
export function formatHexSize(hexSize: string): string {
  try {
    const bytes = parseInt(hexSize, 16);
    return formatBytes(bytes);
  } catch {
    return hexSize;
  }
}

/**
 * Generate an ISO timestamp string suitable for use in filenames.
 * Replaces colons and periods with hyphens.
 * 
 * @returns Timestamp string in format "YYYY-MM-DDTHH-MM-SS"
 * @example
 * getTimestampString() // "2026-02-08T12-30-45"
 */
export function getTimestampString(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
