import { useEffect } from 'react';
import { useDeviceStore } from '../store/deviceStore';

export const useSettings = () => {
  const loadSettings = useDeviceStore((state) => state.loadSettings);
  const isLoading = useDeviceStore((state) => state.isSettingsLoading);
  const isLoaded = useDeviceStore((state) => state.isSettingsLoaded);
  const error = useDeviceStore((state) => state.settingsError);

  useEffect(() => {
    if (!isLoaded && !isLoading && !error) {
      loadSettings();
    }
  }, [loadSettings, isLoaded, isLoading, error]);

  return { isLoading, error };
};
