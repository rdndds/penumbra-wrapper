import { invoke } from '@tauri-apps/api/core';
import type { AdbListEntry, AdbRebootMode, AdbStatResult, AdbUsbDevice } from '../../types';

export class AdbApi {
  static async listDevices(): Promise<AdbUsbDevice[]> {
    return invoke('adb_list_devices');
  }

  static async shellCommand(
    deviceId: string,
    command: string,
    operationId: string
  ): Promise<void> {
    return invoke('adb_shell_command', { deviceId, command, operationId });
  }

  static async list(deviceId: string, path: string, operationId: string): Promise<AdbListEntry[]> {
    return invoke('adb_list', { deviceId, path, operationId });
  }

  static async stat(deviceId: string, path: string, operationId: string): Promise<AdbStatResult> {
    return invoke('adb_stat', { deviceId, path, operationId });
  }

  static async push(
    deviceId: string,
    localPath: string,
    remotePath: string,
    operationId: string
  ): Promise<void> {
    return invoke('adb_push', { deviceId, localPath, remotePath, operationId });
  }

  static async pull(
    deviceId: string,
    remotePath: string,
    localPath: string,
    operationId: string
  ): Promise<void> {
    return invoke('adb_pull', { deviceId, remotePath, localPath, operationId });
  }

  static async install(
    deviceId: string,
    apkPath: string,
    operationId: string
  ): Promise<void> {
    return invoke('adb_install', { deviceId, apkPath, operationId });
  }

  static async uninstall(
    deviceId: string,
    packageName: string,
    operationId: string
  ): Promise<void> {
    return invoke('adb_uninstall', { deviceId, packageName, operationId });
  }

  static async systemAction(
    deviceId: string,
    action: string,
    operationId: string
  ): Promise<void> {
    return invoke('adb_system_action', { deviceId, action, operationId });
  }

  static async reboot(
    deviceId: string,
    mode: AdbRebootMode,
    operationId: string
  ): Promise<void> {
    return invoke('adb_reboot', { deviceId, mode, operationId });
  }

  static async framebufferSave(deviceId: string, operationId: string): Promise<string> {
    return invoke('adb_framebuffer_save', { deviceId, operationId });
  }

  static async authCheck(deviceId: string, operationId: string): Promise<void> {
    return invoke('adb_auth_check', { deviceId, operationId });
  }
}
