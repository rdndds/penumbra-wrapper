import { invoke } from '@tauri-apps/api/core';
import type { FastbootDevice, FastbootRebootMode } from '../../types';

export class FastbootToolsApi {
  static async listDevices(): Promise<FastbootDevice[]> {
    return invoke('fastboot_list_devices');
  }

  static async getvarAll(deviceId: string, operationId: string): Promise<number> {
    return invoke('fastboot_getvar_all', {
      deviceId,
      operationId,
    });
  }

  static async flash(
    deviceId: string,
    partition: string,
    imagePath: string,
    operationId: string
  ): Promise<void> {
    return invoke('fastboot_flash', {
      deviceId,
      partition,
      imagePath,
      operationId,
    });
  }

  static async reboot(
    deviceId: string,
    mode: FastbootRebootMode,
    operationId: string
  ): Promise<void> {
    return invoke('fastboot_reboot', {
      deviceId,
      mode,
      operationId,
    });
  }
}
