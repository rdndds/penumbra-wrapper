import { invoke } from '@tauri-apps/api/core';
import type { PartitionListResult } from '../../types';

/**
 * Device API service - Handles device connection and control operations.
 * Centralizes all Tauri invoke calls related to device management.
 */
export class DeviceApi {
  static async cancelOperation(): Promise<void> {
    return invoke('cancel_operation');
  }

  /**
   * Connect to device and retrieve partition list.
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param preloaderPath - Optional path to preloader file
   * @returns Promise resolving to partition list result
   * @throws Error if connection fails or device not found
   */
  static async connect(
    daPath: string,
    preloaderPath?: string
  ): Promise<PartitionListResult> {
    return invoke('list_partitions', {
      daPath,
      preloaderPath: preloaderPath || null,
    });
  }

  /**
   * Reboot device to the specified mode.
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param mode - Reboot mode: 'normal' for standard reboot, 'fastboot' for fastboot mode
   * @param preloaderPath - Optional path to preloader file
   * @returns Promise resolving when reboot command is sent
   * @throws Error if reboot fails
   */
  static async reboot(
    daPath: string,
    mode: 'normal' | 'fastboot',
    preloaderPath?: string
  ): Promise<void> {
    return invoke('reboot_device', {
      daPath,
      mode,
      preloaderPath: preloaderPath || null,
    });
  }

  /**
   * Shutdown the device gracefully.
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param preloaderPath - Optional path to preloader file
   * @returns Promise resolving when shutdown command is sent
   * @throws Error if shutdown fails
   */
  static async shutdown(
    daPath: string,
    preloaderPath?: string
  ): Promise<void> {
    return invoke('shutdown_device', {
      daPath,
      preloaderPath: preloaderPath || null,
    });
  }

  /**
   * Execute seccfg operation (lock/unlock bootloader).
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param action - 'unlock' or 'lock'
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking
   */
  static async seccfgOperation(
    daPath: string,
    action: 'unlock' | 'lock',
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('seccfg_operation', {
      daPath,
      action,
      preloaderPath: preloaderPath || null,
      operationId: operationId || null,
    });
  }
}
