import { useState } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { PartitionApi } from '../services/api/partitionApi';
import type { Partition } from '../types';
import { executeOperation } from '../services/operations/executeOperation';

/**
 * Custom hook for partition operations (read, write, format, erase).
 * 
 * Encapsulates partition operation logic including:
 * - Operation initialization and tracking
 * - Log panel management
 * - Communication with PartitionApi
 * - Error handling and user feedback
 * - Execution state management
 * 
 * All operations automatically:
 * - Open the log panel
 * - Generate unique operation IDs
 * - Show success/error toasts
 * - Track operation state
 * 
 * @returns Object containing partition operation methods and execution state
 * 
 * @example
 * ```tsx
 * const { readPartition, writePartition, formatPartition, erasePartition, isExecuting } 
 *   = usePartitionOperations();
 * 
 * const handleRead = async () => {
 *   const success = await readPartition(partition, '/path/to/output.img');
 *   if (success) {
 *     console.log('Read completed');
 *   }
 * };
 * ```
 */
export function usePartitionOperations() {
  const { daPath, preloaderPath } = useDeviceStore();
  const [isExecuting, setIsExecuting] = useState(false);

  const runPartitionOperation = async (params: {
    operation: string;
    type: 'read' | 'write';
    partition: Partition;
    successMessage: string;
    run: (operationId: string) => Promise<void>;
  }): Promise<boolean> => {
    if (!daPath) return false;

    setIsExecuting(true);
    try {
      const result = await executeOperation({
        operation: params.operation,
        type: params.type,
        partitionName: params.partition.name,
        partitionSize: params.partition.display_size,
        successMessage: params.successMessage,
        run: params.run,
      });
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Read partition data to a file.
   * 
   * @param partition - Partition to read
   * @param outputPath - Path where partition data will be saved
   * @returns Promise resolving to true if read successful, false otherwise
   */
  const readPartition = async (
    partition: Partition,
    outputPath: string
  ): Promise<boolean> => {
    return runPartitionOperation({
      operation: 'Read partition',
      type: 'read',
      partition,
      successMessage: `Successfully read ${partition.name}`,
      run: (operationId) =>
        PartitionApi.read({
          daPath: daPath as string,
          partition: partition.name,
          outputPath,
          preloaderPath: preloaderPath || undefined,
          operationId,
        }),
    });
  };

  /**
   * Write (flash) an image file to a partition.
   * 
   * @param partition - Partition to write to
   * @param imagePath - Path to the image file to flash
   * @returns Promise resolving to true if write successful, false otherwise
   */
  const writePartition = async (
    partition: Partition,
    imagePath: string
  ): Promise<boolean> => {
    return runPartitionOperation({
      operation: 'Write partition',
      type: 'write',
      partition,
      successMessage: `Successfully flashed ${partition.name}`,
      run: (operationId) =>
        PartitionApi.write({
          daPath: daPath as string,
          partition: partition.name,
          imagePath,
          preloaderPath: preloaderPath || undefined,
          operationId,
        }),
    });
  };

  /**
   * Format a partition (clear all data).
   * 
   * @param partition - Partition to format
   * @returns Promise resolving to true if format successful, false otherwise
   */
  const formatPartition = async (partition: Partition): Promise<boolean> => {
    return runPartitionOperation({
      operation: 'Format partition',
      type: 'write',
      partition,
      successMessage: `Successfully formatted ${partition.name}`,
      run: (operationId) =>
        PartitionApi.format(
          daPath as string,
          partition.name,
          preloaderPath || undefined,
          operationId
        ),
    });
  };

  /**
   * Erase a partition (similar to format).
   * 
   * @param partition - Partition to erase
   * @returns Promise resolving to true if erase successful, false otherwise
   */
  const erasePartition = async (partition: Partition): Promise<boolean> => {
    return runPartitionOperation({
      operation: 'Erase partition',
      type: 'write',
      partition,
      successMessage: `Successfully erased ${partition.name}`,
      run: (operationId) =>
        PartitionApi.erase(
          daPath as string,
          partition.name,
          preloaderPath || undefined,
          operationId
        ),
    });
  };

  return {
    readPartition,
    writePartition,
    formatPartition,
    erasePartition,
    isExecuting,
  };
}
