import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Flasher } from './pages/Flasher';
import { Tools } from './pages/Tools';
import { LogPanel } from './components/LogPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdateAvailableModal } from './components/UpdateAvailableModal';
import { useOperationStream } from './hooks/useOperationStream';
import { useSettings } from './hooks/useSettings';
import { ConfirmationProvider } from './hooks/confirmationProvider';
import { DeviceApi } from './services/api/deviceApi';
import { useDeviceStore } from './store/deviceStore';
import { useUpdateStore } from './store/updateStore';

function AppContent() {
  useOperationStream();

  const { isLoading: isSettingsLoading, error: settingsError } = useSettings();
  const autoCheckUpdates = useDeviceStore((state) => state.autoCheckUpdates);
  const isSettingsLoaded = useDeviceStore((state) => state.isSettingsLoaded);
  const hasPromptedUpdate = useRef(false);
  const updateInfo = useUpdateStore((state) => state.updateInfo);
  const isUpdateModalOpen = useUpdateStore((state) => state.isUpdateModalOpen);
  const isDownloadingUpdate = useUpdateStore((state) => state.isDownloadingUpdate);
  const downloadProgress = useUpdateStore((state) => state.downloadProgress);
  const checkUpdate = useUpdateStore((state) => state.checkUpdate);
  const downloadUpdate = useUpdateStore((state) => state.downloadUpdate);
  const setUpdateModalOpen = useUpdateStore((state) => state.setUpdateModalOpen);
  const startProgressListener = useUpdateStore((state) => state.startProgressListener);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    startProgressListener()
      .then((unlisten) => {
        cleanup = unlisten;
      })
      .catch(() => undefined);

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [startProgressListener]);

  useEffect(() => {
    if (!isSettingsLoaded || !autoCheckUpdates) return;
    if (hasPromptedUpdate.current) return;
    hasPromptedUpdate.current = true;

    checkUpdate({ showToast: false });
  }, [autoCheckUpdates, checkUpdate, isSettingsLoaded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      DeviceApi.cancelOperation().catch(() => undefined);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  return (
    <BrowserRouter>
        {isSettingsLoading && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] px-3 py-1.5 text-xs font-medium bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)] rounded-full shadow">
            Loading settings...
          </div>
        )}
        {settingsError && (
          <div className="fixed top-3 right-3 z-[200] px-3 py-1.5 text-xs font-medium bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)] rounded shadow">
            Settings load failed: {settingsError}
          </div>
        )}
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="flasher" element={<Flasher />} />
          <Route path="tools" element={<Tools />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" />

      <UpdateAvailableModal
        isOpen={isUpdateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        onDownload={downloadUpdate}
        updateInfo={updateInfo}
        isDownloading={isDownloadingUpdate}
        downloadProgress={downloadProgress}
      />

      <ErrorBoundary>
        <LogPanel />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ConfirmationProvider>
      <AppContent />
    </ConfirmationProvider>
  );
}

export default App;
