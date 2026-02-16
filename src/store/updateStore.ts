import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';
import { AntumbraApi } from '../services/api/antumbraApi';
import { ErrorHandler } from '../services/utils/errorHandler';
import { WindowsErrorHandler } from '../services/utils/windowsErrorHandler';
import { useOperationStore } from './operationStore';
import type { AntumbraUpdateInfo, DownloadProgress } from '../types';

interface UpdateState {
  updateInfo: AntumbraUpdateInfo | null;
  isCheckingUpdate: boolean;
  isDownloadingUpdate: boolean;
  downloadProgress: DownloadProgress | null;
  isUpdateModalOpen: boolean;
  setUpdateModalOpen: (open: boolean) => void;
  checkUpdate: (options?: { showToast?: boolean }) => Promise<void>;
  downloadUpdate: () => Promise<void>;
  startProgressListener: () => Promise<() => void>;
}

let progressUnlisten: (() => void) | null = null;
let listenerPromise: Promise<() => void> | null = null;
let hasShownDownloadSuccess = false;

export const useUpdateStore = create<UpdateState>((set) => ({
  updateInfo: null,
  isCheckingUpdate: false,
  isDownloadingUpdate: false,
  downloadProgress: null,
  isUpdateModalOpen: false,

  setUpdateModalOpen: (open) => set({ isUpdateModalOpen: open }),

  checkUpdate: async (options) => {
    const { showToast = true } = options || {};
    set({ isCheckingUpdate: true });

    try {
      const info = await AntumbraApi.checkUpdate();
      set({ updateInfo: info });

      if (!info.supported) {
        if (showToast) {
          toast.error(info.message || 'Antumbra updates are not available on this platform');
        }
        set({ isUpdateModalOpen: false });
        return;
      }

      const needsInstall = !info.installed_path || !info.installed_version;

      if (info.update_available || needsInstall) {
        set({ isUpdateModalOpen: true });
      } else if (showToast) {
        toast.success('Antumbra is up to date');
      }
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Check antumbra updates', {
        addToOperationLog: false,
        showToast,
      });
    } finally {
      set({ isCheckingUpdate: false });
    }
  },

  downloadUpdate: async () => {
    set({ isDownloadingUpdate: true, downloadProgress: null, isUpdateModalOpen: true });
    hasShownDownloadSuccess = false;

    try {
      await AntumbraApi.downloadUpdate();
      set({ isUpdateModalOpen: false });

      const info = await AntumbraApi.checkUpdate();
      set({ updateInfo: info });
    } catch (error: unknown) {
      const customMessage = WindowsErrorHandler.getErrorSuggestion(error);

      ErrorHandler.handle(error, 'Download antumbra update', {
        addToOperationLog: false,
        customMessage,
      });

      if (WindowsErrorHandler.isWindowsError(error)) {
        const steps = WindowsErrorHandler.getTroubleshootingSteps(error);
        if (steps.length > 0) {
          steps.forEach((step, index) => {
            useOperationStore.getState().addLog({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Troubleshooting step ${index + 1}: ${step}`,
            });
          });
        }
      }
    } finally {
      set({ isDownloadingUpdate: false });
    }
  },

  startProgressListener: async () => {
    if (progressUnlisten) return progressUnlisten;
    if (listenerPromise) return listenerPromise;

    listenerPromise = listen<DownloadProgress>('antumbra-download-progress', (event) => {
      set({ downloadProgress: event.payload });

      if (event.payload.status === 'failed') {
        toast.error(`Download failed: ${event.payload.message}`);
      }

      if (event.payload.status === 'completed' && !hasShownDownloadSuccess) {
        toast.success(event.payload.message);
        hasShownDownloadSuccess = true;
      }
    }).then((unlisten) => {
      progressUnlisten = unlisten;
      return unlisten;
    }).catch((error) => {
      console.error('Failed to setup download progress listener:', error);
      return () => undefined;
    });

    return listenerPromise;
  },
}));
