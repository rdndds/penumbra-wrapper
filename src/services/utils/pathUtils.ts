/**
 * Path Utilities - Cross-platform path manipulation functions.
 */

/**
 * Extract filename from a full file path (cross-platform).
 * Works with both Unix (/) and Windows (\) path separators.
 * 
 * @param path - Full file path
 * @returns Filename without directory path
 * @example
 * getBasename("/home/user/file.txt") // "file.txt"
 * getBasename("C:\\Users\\file.txt") // "file.txt"
 */
export function getBasename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

/**
 * Extract directory path from a full file path.
 * 
 * @param path - Full file path
 * @returns Directory path without filename
 * @example
 * getDirname("/home/user/file.txt") // "/home/user"
 * getDirname("C:\\Users\\file.txt") // "C:/Users"
 */
export function getDirname(path: string): string {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join('/');
}

/**
 * Generate a filename with embedded timestamp.
 * Useful for creating unique backup filenames.
 * 
 * @param baseName - Base name for the file (without extension)
 * @param extension - File extension (default: 'img')
 * @returns Timestamped filename
 * @example
 * generateTimestampedFilename("backup", "img") 
 * // "backup_2026-02-08T12-30-45.img"
 */
export function generateTimestampedFilename(
  baseName: string,
  extension: string = 'img'
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${baseName}_${timestamp}.${extension}`;
}

/**
 * Join multiple path segments into a single path.
 * Uses backslash when Windows-style paths are detected.
 * 
 * @param segments - Path segments to join
 * @returns Joined path
 * @example
 * joinPath("home", "user", "file.txt") // "home/user/file.txt"
 */
export function joinPath(...segments: string[]): string {
  const filtered = segments.filter(Boolean);
  if (filtered.length === 0) return '';

  const useBackslash = filtered.some((segment) => segment.includes('\\') || /^[A-Za-z]:/.test(segment));
  const separator = useBackslash ? '\\' : '/';
  const escapedSeparator = separator.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

  const cleaned = filtered.map((segment, index) => {
    const normalized = segment.replace(/[\\/]+/g, separator);
    if (index === 0) {
      return normalized.replace(new RegExp(`${escapedSeparator}+$`), '');
    }
    return normalized.replace(
      new RegExp(`^${escapedSeparator}+|${escapedSeparator}+$`, 'g'),
      ''
    );
  });

  return cleaned.join(separator);
}
