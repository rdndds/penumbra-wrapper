import { invoke } from '@tauri-apps/api/core'
import type { AntumbraCommandInfo, AntumbraUpdateInfo, AntumbraUpdateResult } from '../../types'

export class AntumbraApi {
  static async getUpdatablePath(): Promise<string> {
    return invoke('get_antumbra_updatable_path')
  }

  static async checkUpdate(): Promise<AntumbraUpdateInfo> {
    return invoke('check_antumbra_update')
  }

  static async downloadUpdate(): Promise<AntumbraUpdateResult> {
    return invoke('download_antumbra_update')
  }

  static async getWrapperLogPath(): Promise<string> {
    return invoke('get_wrapper_log_path')
  }

  static async readWrapperLog(): Promise<string> {
    return invoke('read_wrapper_log')
  }

  static async readAntumbraLog(): Promise<string> {
    return invoke('read_antumbra_log')
  }

  static async getLastCommand(): Promise<AntumbraCommandInfo | null> {
    return invoke('get_last_antumbra_command')
  }
}
