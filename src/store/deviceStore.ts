import { create } from 'zustand';
import type { AppSettings } from '../types';
import { SettingsApi } from '../services/api/settingsApi';
import { ErrorHandler } from '../services/utils/errorHandler';

interface DeviceState {
  // Configuration (persisted)
  daPath: string | null;
  preloaderPath: string | null;
  defaultOutputPath: string | null;
  antumbraVersion: string | null;
  autoCheckUpdates: boolean;

  // Settings hydration
  isSettingsLoading: boolean;
  isSettingsLoaded: boolean;
  settingsError: string | null;
  
  // Connection state (not persisted)
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  
  // Actions
  setDaPath: (path: string) => Promise<void>;
  setPreloaderPath: (path: string | null) => Promise<void>;
  setDefaultOutputPath: (path: string | null) => Promise<void>;
  setAutoCheckUpdates: (enabled: boolean) => Promise<void>;
  setConnecting: (connecting: boolean) => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  disconnect: () => void;
  
  // Settings
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  // Configuration
  daPath: null,
  preloaderPath: null,
  defaultOutputPath: null,
  antumbraVersion: null,
  autoCheckUpdates: true,

  // Connection State
  isConnecting: false,
  isConnected: false,
  connectionError: null,

  // Settings hydration
  isSettingsLoading: false,
  isSettingsLoaded: false,
  settingsError: null,

  // Actions
  setDaPath: async (path) => {
    set({ daPath: path });
    await get().saveSettings();
  },

  setPreloaderPath: async (path) => {
    set({ preloaderPath: path });
    await get().saveSettings();
  },

  setDefaultOutputPath: async (path) => {
    set({ defaultOutputPath: path });
    await get().saveSettings();
  },

  setAutoCheckUpdates: async (enabled) => {
    set({ autoCheckUpdates: enabled });
    await get().saveSettings();
  },

  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),

  disconnect: () =>
    set({
      isConnected: false,
      connectionError: null,
    }),

  // Settings
  loadSettings: async () => {
    try {
      set({ isSettingsLoading: true, settingsError: null });
      const settings = await SettingsApi.getSettings();
      set({
        daPath: settings.da_path || null,
        preloaderPath: settings.preloader_path || null,
        defaultOutputPath: settings.default_output_path || null,
        antumbraVersion: settings.antumbra_version || null,
        autoCheckUpdates: settings.auto_check_updates,
        isSettingsLoaded: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings';
      set({ settingsError: message, isSettingsLoaded: false });
      ErrorHandler.handle(error, 'Load settings', {
        showToast: false,
        addToOperationLog: false,
      });
    } finally {
      set({ isSettingsLoading: false });
    }
  },

  saveSettings: async () => {
    try {
      const { daPath, preloaderPath, defaultOutputPath, autoCheckUpdates } = get();
      const settings: AppSettings = {
        da_path: daPath || undefined,
        preloader_path: preloaderPath || undefined,
        default_output_path: defaultOutputPath || undefined,
        auto_check_updates: autoCheckUpdates,
      };
      await SettingsApi.updateSettings(settings);
    } catch (error) {
      ErrorHandler.handle(error, 'Save settings', {
        addToOperationLog: false,
      });
    }
  },
}));
