import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Flasher } from './pages/Flasher';
import { Tools } from './pages/Tools';
import { LogPanel } from './components/LogPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useOperationStream } from './hooks/useOperationStream';
import { useSettings } from './hooks/useSettings';
import { useConfirmation } from './hooks/useConfirmation';
import { ConfirmationProvider } from './hooks/confirmationProvider';
import { AntumbraApi } from './services/api/antumbraApi';
import { DeviceApi } from './services/api/deviceApi';
import { ErrorHandler } from './services/utils/errorHandler';
import { WindowsErrorHandler } from './services/utils/windowsErrorHandler';
import { useDeviceStore } from './store/deviceStore';
import toast from 'react-hot-toast';

function AppContent() {
  useOperationStream();

  const { isLoading: isSettingsLoading, error: settingsError } = useSettings();
  const { confirm } = useConfirmation();
  const autoCheckUpdates = useDeviceStore((state) => state.autoCheckUpdates);
  const isSettingsLoaded = useDeviceStore((state) => state.isSettingsLoaded);
  const hasPromptedUpdate = useRef(false);

  useEffect(() => {
    if (!isSettingsLoaded || !autoCheckUpdates) return;
    if (hasPromptedUpdate.current) return;
    hasPromptedUpdate.current = true;

    const checkUpdates = async () => {
      try {
        const info = await AntumbraApi.checkUpdate();
        if (!info.supported) return;

        if (!info.installed_path) {
          const confirmed = await confirm({
            title: 'Antumbra Not Installed',
            message: 'Antumbra is required to connect to devices. Download it now?',
            variant: 'info',
            confirmText: 'Download',
            cancelText: 'Later',
          });

          if (confirmed) {
            const result = await AntumbraApi.downloadUpdate();
            toast.success(`Antumbra downloaded (${result.version})`);
          }

          return;
        }

        if (info.update_available) {
          const confirmed = await confirm({
            title: 'Antumbra Update Available',
            message: `A newer antumbra build is available (${info.latest_version}). Download now?`,
            variant: 'info',
            confirmText: 'Update',
            cancelText: 'Later',
          });

          if (confirmed) {
            const result = await AntumbraApi.downloadUpdate();
            toast.success(`Antumbra updated to ${result.version}`);
          }
        }
      } catch (error: unknown) {
        // WindowsErrorHandler now handles structured errors from backend
        const customMessage = WindowsErrorHandler.getErrorSuggestion(error);
        
        ErrorHandler.handle(error, 'Check antumbra updates', {
          showToast: false,
          addToOperationLog: false,
          customMessage,
        });
      }
    };

    checkUpdates();
  }, [autoCheckUpdates, confirm, isSettingsLoaded]);

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
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-full shadow">
          Loading settings...
        </div>
      )}
      {settingsError && (
        <div className="fixed top-3 right-3 z-[200] px-3 py-1.5 text-xs font-medium bg-red-900/80 text-red-100 border border-red-700 rounded shadow">
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
