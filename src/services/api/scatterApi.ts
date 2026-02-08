import { invoke } from '@tauri-apps/api/core';
import type { ScatterFile, ScatterPartition } from '../../types';
import { ErrorHandler } from '../utils/errorHandler';

/**
 * Scatter API service - Handles scatter file parsing and image detection.
 * Centralizes all Tauri invoke calls related to scatter file operations.
 */
export class ScatterApi {
  /**
   * Parse a MediaTek scatter file and extract partition information.
   * 
   * @param filePath - Path to the scatter file (.txt)
   * @returns Promise resolving to parsed scatter file data
   * @throws Error if parsing fails or file is invalid
   */
  static async parseScatterFile(filePath: string): Promise<ScatterFile> {
    return invoke('parse_scatter_file', { filePath });
  }

  /**
   * Auto-detect image files for scatter partitions.
   * Attempts to find matching .img files in the same directory as the scatter file.
   * 
   * @param scatterPath - Path to the scatter file
   * @param partitions - Array of partitions from the scatter file
   * @returns Promise resolving to a Map of partition names to image file paths
   */
  static async detectImageFiles(
    scatterPath: string,
    partitions: ScatterPartition[]
  ): Promise<Map<string, string>> {
    try {
      const result = await invoke<Record<string, string>>('detect_image_files', {
        scatterPath,
        partitions,
      });
      return new Map(Object.entries(result));
    } catch (error) {
      ErrorHandler.handle(error, 'Detect image files', {
        showToast: false,
        addToOperationLog: false,
      });
      return new Map();
    }
  }
}
