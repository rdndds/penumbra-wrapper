import { useState } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { DeviceApi } from '../services/api/deviceApi';
import { ErrorHandler } from '../services/utils/errorHandler';

// Stable selector functions to prevent unnecessary re-subscriptions
const selectIsConnected = (state: ReturnType<typeof useDeviceStore.getState>) => state.isConnected;
const selectIsConnecting = (state: ReturnType<typeof useDeviceStore.getState>) => state.isConnecting;

/**
 * Custom hook for managing device connection lifecycle.
 * 
 * Encapsulates connection logic including:
 * - Validation of DA file selection
 * - Connection to device via DeviceApi
 * - Partition list retrieval
 * - Connection state management
 * - Error handling and user feedback
 * 
 * @returns Object containing connection methods and state
 * 
 * @example
 * ```tsx
 * const { connect, disconnect, isConnected, isConnecting, error } = useDeviceConnection();
 * 
 * const handleConnect = async () => {
 *   const success = await connect();
 *   if (success) {
 *     console.log('Connected to device');
 *   }
 * };
 * ```
 */
export function useDeviceConnection() {
  const { daPath, preloaderPath, setConnected, setConnecting, disconnect: storeDisconnect } = useDeviceStore();
  const { setPartitions, clearPartitions } = usePartitionStore();
  const [error, setError] = useState<string | null>(null);

  /**
   * Connect to the device and retrieve partition list.
   * 
   * @returns Promise resolving to true if connection successful, false otherwise
   */
  const connect = async () => {
    if (!daPath) {
      ErrorHandler.handle(
        new Error('No DA file selected'),
        'Connection',
        { customMessage: 'Please select a DA file first' }
      );
      return false;
    }

    setConnecting(true);
    setError(null);

    try {
      await DeviceApi.cancelOperation();
      const result = await DeviceApi.connect(daPath, preloaderPath || undefined);
      setPartitions(result.partitions);
      setConnected(true);
      ErrorHandler.success(
        'Connection',
        `Connected! Found ${result.partitions.length} partitions`
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      ErrorHandler.handle(err, 'Connection');
      setConnected(false);
      return false;
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Disconnect from the device and clear partition data.
   */
  const disconnect = () => {
    DeviceApi.cancelOperation().catch(() => undefined);
    storeDisconnect();
    clearPartitions();
  };

  return {
    connect,
    disconnect,
    isConnected: useDeviceStore(selectIsConnected),
    isConnecting: useDeviceStore(selectIsConnecting),
    error,
  };
}
