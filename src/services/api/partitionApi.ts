import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Options for reading a partition.
 */
export interface ReadPartitionOptions {
  /** Path to the Download Agent (DA) file */
  daPath: string;
  /** Name of the partition to read */
  partition: string;
  /** Output file path where partition data will be saved */
  outputPath: string;
  /** Optional path to preloader file */
  preloaderPath?: string;
  /** Optional operation ID for tracking (auto-generated if not provided) */
  operationId?: string;
}

/**
 * Options for writing to a partition.
 */
export interface WritePartitionOptions {
  /** Path to the Download Agent (DA) file */
  daPath: string;
  /** Name of the partition to write to */
  partition: string;
  /** Path to the image file to flash */
  imagePath: string;
  /** Optional path to preloader file */
  preloaderPath?: string;
  /** Optional operation ID for tracking (auto-generated if not provided) */
  operationId?: string;
}

/**
 * Partition API service - Handles partition read/write/format/erase operations.
 * Centralizes all Tauri invoke calls related to partition management.
 */
export class PartitionApi {
  /**
   * Read partition data to a file.
   * 
   * @param options - Read operation options
   * @returns Promise resolving when operation completes
   * @throws Error if read fails
   */
  static async read(options: ReadPartitionOptions): Promise<void> {
    return invoke('read_partition', {
      daPath: options.daPath,
      partition: options.partition,
      outputPath: options.outputPath,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Write (flash) an image file to a partition.
   * 
   * @param options - Write operation options
   * @returns Promise resolving when operation completes
   * @throws Error if write fails
   */
  static async write(options: WritePartitionOptions): Promise<void> {
    return invoke('flash_partition', {
      daPath: options.daPath,
      partition: options.partition,
      imagePath: options.imagePath,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Format a partition (clear all data).
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param partition - Name of the partition to format
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking (auto-generated if not provided)
   * @returns Promise resolving when operation completes
   * @throws Error if format fails
   */
  static async format(
    daPath: string,
    partition: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('format_partition', {
      daPath,
      partition,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Erase a partition (similar to format, but may use different method).
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param partition - Name of the partition to erase
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking (auto-generated if not provided)
   * @returns Promise resolving when operation completes
   * @throws Error if erase fails
   */
  static async erase(
    daPath: string,
    partition: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('erase_partition', {
      daPath,
      partition,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Read all partitions (bulk backup operation).
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param outputDir - Directory where partition backups will be saved
   * @param skipPartitions - Array of partition names to skip
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking (auto-generated if not provided)
   * @returns Promise resolving when all operations complete
   * @throws Error if any read operation fails
   */
  static async readAll(
    daPath: string,
    outputDir: string,
    skipPartitions: string[],
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('read_all_partitions', {
      daPath,
      outputDir,
      skipPartitions,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }
}
