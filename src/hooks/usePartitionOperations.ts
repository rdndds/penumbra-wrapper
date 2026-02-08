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
    if (!daPath) return false;

    setIsExecuting(true);
    try {
      const result = await executeOperation({
        operation: 'Read partition',
        type: 'read',
        partitionName: partition.name,
        partitionSize: partition.display_size,
        successMessage: `Successfully read ${partition.name}`,
        run: (operationId) =>
          PartitionApi.read({
            daPath,
            partition: partition.name,
            outputPath,
            preloaderPath: preloaderPath || undefined,
            operationId,
          }),
      });
      return result.success;
    } finally {
      setIsExecuting(false);
    }
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
    if (!daPath) return false;

    setIsExecuting(true);
    try {
      const result = await executeOperation({
        operation: 'Write partition',
        type: 'write',
        partitionName: partition.name,
        partitionSize: partition.display_size,
        successMessage: `Successfully flashed ${partition.name}`,
        run: (operationId) =>
          PartitionApi.write({
            daPath,
            partition: partition.name,
            imagePath,
            preloaderPath: preloaderPath || undefined,
            operationId,
          }),
      });
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Format a partition (clear all data).
   * 
   * @param partition - Partition to format
   * @returns Promise resolving to true if format successful, false otherwise
   */
  const formatPartition = async (partition: Partition): Promise<boolean> => {
    if (!daPath) return false;

    setIsExecuting(true);
    try {
      const result = await executeOperation({
        operation: 'Format partition',
        type: 'write',
        partitionName: partition.name,
        partitionSize: partition.display_size,
        successMessage: `Successfully formatted ${partition.name}`,
        run: (operationId) =>
          PartitionApi.format(
            daPath,
            partition.name,
            preloaderPath || undefined,
            operationId
          ),
      });
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Erase a partition (similar to format).
   * 
   * @param partition - Partition to erase
   * @returns Promise resolving to true if erase successful, false otherwise
   */
  const erasePartition = async (partition: Partition): Promise<boolean> => {
    if (!daPath) return false;

    setIsExecuting(true);
    try {
      const result = await executeOperation({
        operation: 'Erase partition',
        type: 'write',
        partitionName: partition.name,
        partitionSize: partition.display_size,
        successMessage: `Successfully erased ${partition.name}`,
        run: (operationId) =>
          PartitionApi.erase(
            daPath,
            partition.name,
            preloaderPath || undefined,
            operationId
          ),
      });
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    readPartition,
    writePartition,
    formatPartition,
    erasePartition,
    isExecuting,
  };
}
