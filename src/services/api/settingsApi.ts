import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '../../types';

export class SettingsApi {
  static async getSettings(): Promise<AppSettings> {
    return invoke('get_settings');
  }

  static async updateSettings(settings: AppSettings): Promise<void> {
    return invoke('update_settings', { settings });
  }
}
