import { open, save } from '@tauri-apps/plugin-dialog';

/**
 * Dialog types supported by the file dialog service.
 */
export type DialogType = 'da' | 'preloader' | 'image' | 'scatter' | 'output' | 'backup';

/**
 * Enum-like object for dialog types (provides better IDE autocomplete).
 */
export const DialogType = {
  DA_FILE: 'da' as const,
  PRELOADER_FILE: 'preloader' as const,
  IMAGE_FILE: 'image' as const,
  SCATTER_FILE: 'scatter' as const,
  OUTPUT_FOLDER: 'output' as const,
  BACKUP_FOLDER: 'backup' as const,
};

/**
 * Configuration for a file dialog.
 */
export interface DialogConfig {
  /** Dialog window title */
  title: string;
  /** Whether to select a directory instead of a file */
  directory?: boolean;
  /** File type filters */
  filters?: Array<{ name: string; extensions: string[] }>;
}

/**
 * Predefined configurations for each dialog type.
 */const DIALOG_CONFIGS: Record<string, DialogConfig> = {
  'da': {
    title: 'Select DA File',
    filters: [
      { name: 'DA Files', extensions: ['bin', 'da'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  },
  'preloader': {
    title: 'Select Preloader File (Optional)',
    filters: [
      { name: 'Preloader Files', extensions: ['bin'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  },
  'image': {
    title: 'Select Image File',
    filters: [
      { name: 'Image Files', extensions: ['img', 'bin', 'raw'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  },
  'scatter': {
    title: 'Select Scatter File',
    filters: [
      { name: 'Scatter Files', extensions: ['txt', 'xml'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  },
  'output': {
    title: 'Select Output Folder',
    directory: true,
  },
  'backup': {
    title: 'Select Backup Folder',
    directory: true,
  },
};

/**
 * File Dialog Service - Centralized file and folder selection dialogs.
 * Provides consistent dialog configurations across the application.
 * 
 * Supported dialog types:
 * - DA files (.bin, .da)
 * - Preloader files (.bin)
 * - Image files (.img, .bin, .raw)
 * - Scatter files (.txt, .xml)
 * - Output/Backup folders
 */
export class FileDialogService {
  /**
   * Open a file or folder selection dialog.
   * 
   * @param type - The type of file/folder to select
   * @returns Promise resolving to the selected path, or null if cancelled
   */
  static async selectFile(
    type: DialogType,
    overrides?: Partial<DialogConfig>
  ): Promise<string | null> {
    const baseConfig = DIALOG_CONFIGS[type];
    const config = { ...baseConfig, ...overrides };
    const result = await open({
      title: config.title,
      multiple: false,
      directory: config.directory || false,
      filters: config.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result as string | null;
  }

  /**
   * Open a save file dialog.
   * Used for saving partition backups with a default filename.
   * 
   * @param defaultPath - Optional default file path (including filename)
   * @param defaultExtension - Default file extension ('img' or 'bin')
   * @returns Promise resolving to the save path, or null if cancelled
   */
  static async saveFile(options?: {
    defaultPath?: string;
    defaultExtension?: 'img' | 'bin';
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | null> {
    const defaultExtension = options?.defaultExtension || 'img';
    const result = await save({
      title: options?.title || 'Save Partition Backup',
      defaultPath: options?.defaultPath,
      filters:
        options?.filters ||
        [
          { name: 'Image Files', extensions: [defaultExtension] },
          { name: 'All Files', extensions: ['*'] },
        ],
    });
    return result as string | null;
  }
}
