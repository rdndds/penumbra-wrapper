import { invoke } from '@tauri-apps/api/core';
import type { WindowsDiagnostics } from '../../types';

export class DiagnosticsApi {
  static async checkWindowsEnvironment(): Promise<WindowsDiagnostics> {
    return invoke('check_windows_environment');
  }
}
