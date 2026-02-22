import { invoke } from '@tauri-apps/api/core';
import type { FastbootDevice, FastbootRebootMode, FastbootSlot } from '../../types';

export class FastbootToolsApi {
  static async listDevices(): Promise<FastbootDevice[]> {
    return invoke('fastboot_list_devices');
  }

  static async getvarAll(deviceId: string, operationId: string): Promise<string[]> {
    return invoke('fastboot_getvar_all', {
      deviceId,
      operationId,
    });
  }

  static async getvar(
    deviceId: string,
    name: string,
    operationId: string
  ): Promise<string> {
    return invoke('fastboot_getvar', {
      deviceId,
      name,
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

  static async erase(deviceId: string, partition: string, operationId: string): Promise<void> {
    return invoke('fastboot_erase', {
      deviceId,
      partition,
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

  static async setActiveSlot(
    deviceId: string,
    slot: FastbootSlot,
    operationId: string
  ): Promise<void> {
    return invoke('fastboot_set_active_slot', {
      deviceId,
      slot,
      operationId,
    });
  }

  static async rebootFastbootd(deviceId: string, operationId: string): Promise<void> {
    return invoke('fastboot_reboot_fastbootd', {
      deviceId,
      operationId,
    });
  }
}
