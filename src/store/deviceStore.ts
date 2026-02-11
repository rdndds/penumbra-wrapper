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
  updateSettings: (partial: Partial<DeviceState>) => Promise<void>;
  setConnecting: (connecting: boolean) => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  disconnect: () => void;
  
  // Settings
  loadSettings: () => Promise<void>;
  saveSettings: (state?: DeviceState) => Promise<void>;
}

const buildSettings = (state: DeviceState): AppSettings => ({
  da_path: state.daPath || undefined,
  preloader_path: state.preloaderPath || undefined,
  default_output_path: state.defaultOutputPath || undefined,
  auto_check_updates: state.autoCheckUpdates,
  antumbra_version: state.antumbraVersion || undefined,
});

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
    await get().updateSettings({ daPath: path });
  },

  setPreloaderPath: async (path) => {
    await get().updateSettings({ preloaderPath: path });
  },

  setDefaultOutputPath: async (path) => {
    await get().updateSettings({ defaultOutputPath: path });
  },

  setAutoCheckUpdates: async (enabled) => {
    await get().updateSettings({ autoCheckUpdates: enabled });
  },

  updateSettings: async (partial) => {
    const state = get();
    const hasChanges = Object.keys(partial).some((key) => {
      const typedKey = key as keyof DeviceState;
      return state[typedKey] !== partial[typedKey];
    });

    if (!hasChanges) return;

    const nextState = { ...state, ...partial } as DeviceState;
    set(partial as Partial<DeviceState>);
    await get().saveSettings(nextState);
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
      
      // Auto-sync detected antumbra version if config version is null
      // This ensures version consistency between binary and config
      if (!settings.antumbra_version) {
        console.log('Config version is null, attempting to sync from detected binary...');
        // The backend will handle auto-syncing when binary is detected
      }
      
      set({
        daPath: settings.da_path || null,
        preloaderPath: settings.preloader_path || null,
        defaultOutputPath: settings.default_output_path || null,
        antumbraVersion: settings.antumbra_version || null,
        autoCheckUpdates: settings.auto_check_updates,
        isSettingsLoaded: true,
      });
    } catch (error) {
      // ErrorHandler now extracts the message automatically
      const parsedError = ErrorHandler.handle(error, 'Load settings', {
        showToast: false,
        addToOperationLog: false,
      });
      set({ settingsError: parsedError.message, isSettingsLoaded: false });
    } finally {
      set({ isSettingsLoading: false });
    }
  },

  saveSettings: async (stateOverride) => {
    try {
      const sourceState = stateOverride || get();
      const settings = buildSettings(sourceState);
      await SettingsApi.updateSettings(settings);
    } catch (error) {
      ErrorHandler.handle(error, 'Save settings', {
        addToOperationLog: false,
      });
    }
  },
}));
