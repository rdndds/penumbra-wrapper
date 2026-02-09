import { useState, useEffect, useRef } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { useOperationStore } from '../store/operationStore';
import { useUIStore } from '../store/uiStore';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { usePartitionOperations } from '../hooks/usePartitionOperations';
import { useFileSelection } from '../hooks/useFileSelection';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { ConnectionPanel } from '../components/dashboard/ConnectionPanel';
import { PartitionSection } from '../components/dashboard/PartitionSection';
import { OperationModal } from '../components/OperationModal';
import { UpdateAvailableModal } from '../components/UpdateAvailableModal';
import { useConfirmation } from '../hooks/useConfirmation';
import { DialogType } from '../services/dialogs/fileDialogService';
import { DeviceApi } from '../services/api/deviceApi';
import { PartitionApi } from '../services/api/partitionApi';
import { AntumbraApi } from '../services/api/antumbraApi';
import { executeOperation } from '../services/operations/executeOperation';
import { generateTimestampedFilename, joinPath } from '../services/utils/pathUtils';
import { ErrorHandler } from '../services/utils/errorHandler';
import { WindowsErrorHandler } from '../services/utils/windowsErrorHandler';
import toast from 'react-hot-toast';
import type { Partition, AntumbraUpdateInfo } from '../types';
import { v4 as uuidv4 } from 'uuid';

const CRITICAL_PARTITIONS = ['nvram', 'nvdata', 'nvcfg', 'proinfo', 'protect1', 'protect2'];

export function Dashboard() {
  const {
    daPath,
    preloaderPath,
    defaultOutputPath,
    isSettingsLoading,
    setDaPath,
    setPreloaderPath,
    setDefaultOutputPath,
  } = useDeviceStore();
  
  const { partitions } = usePartitionStore();
  const { addLog, clearLogs } = useOperationStore();
  const { openLogPanel } = useUIStore();
  
  const { connect, disconnect, isConnected, isConnecting } = useDeviceConnection();
  const { formatPartition, erasePartition } = usePartitionOperations();
  const { selectFile } = useFileSelection();
  const { confirm } = useConfirmation();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    partition: Partition | null;
    operation: 'read' | 'write';
  }>({
    isOpen: false,
    partition: null,
    operation: 'read',
  });

  const [rebootDropdownOpen, setRebootDropdownOpen] = useState(false);
  const rebootDropdownRef = useRef<HTMLDivElement>(null);
  const [isFastBackupRunning, setIsFastBackupRunning] = useState(false);
  const [backupAbortController, setBackupAbortController] = useState<AbortController | null>(null);
  const backupCancelReasonRef = useRef<'disconnect' | null>(null);

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AntumbraUpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        rebootDropdownRef.current &&
        !rebootDropdownRef.current.contains(event.target as Node)
      ) {
        setRebootDropdownOpen(false);
      }
    };

    if (rebootDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [rebootDropdownOpen]);

  // Cleanup: abort backup on unmount or disconnect
  useEffect(() => {
    return () => {
      if (backupAbortController) {
        backupAbortController.abort();
      }
    };
  }, [backupAbortController]);

  // Cancel backup if device disconnects
  useEffect(() => {
    if (!isConnected && backupAbortController) {
      backupCancelReasonRef.current = 'disconnect';
      backupAbortController.abort();
    }
  }, [isConnected, backupAbortController]);

  const handleSelectDa = async () => {
    const path = await selectFile(DialogType.DA_FILE);
    if (path) {
      await setDaPath(path);
      toast.success('DA file selected');
    }
  };

  const handleSelectPreloader = async () => {
    const path = await selectFile(DialogType.PRELOADER_FILE);
    if (path) {
      await setPreloaderPath(path);
      toast.success('Preloader file selected');
    }
  };

  const handleClearPreloader = async () => {
    await setPreloaderPath(null);
    toast.success('Preloader cleared');
  };

  const handleSelectOutput = async () => {
    const path = await selectFile(DialogType.OUTPUT_FOLDER);
    if (path) {
      await setDefaultOutputPath(path);
      toast.success('Default output folder selected');
    }
  };

  const handleClearOutput = async () => {
    await setDefaultOutputPath(null);
    toast.success('Default output folder cleared');
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await AntumbraApi.checkUpdate();
      setUpdateInfo(info);

      if (!info.supported) {
        toast.error(info.message || 'Antumbra updates are not available on this platform');
        return;
      }

      if (info.update_available) {
        setUpdateModalOpen(true);
      } else {
        toast.success('Antumbra is up to date');
      }
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Check antumbra updates', { addToOperationLog: false });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setIsDownloadingUpdate(true);
    try {
      const result = await AntumbraApi.downloadUpdate();
      toast.success(`Antumbra updated to ${result.version}`);
      setUpdateModalOpen(false);
      
      // Refresh update info
      const info = await AntumbraApi.checkUpdate();
      setUpdateInfo(info);
    } catch (error: unknown) {
      // Use WindowsErrorHandler with the raw error - it now handles structured errors
      const customMessage = WindowsErrorHandler.getErrorSuggestion(error);
      
      ErrorHandler.handle(error, 'Download antumbra update', { 
        addToOperationLog: false,
        customMessage 
      });
      
      // If it's a Windows-specific error, show troubleshooting help
      if (WindowsErrorHandler.isWindowsError(error)) {
        const steps = WindowsErrorHandler.getTroubleshootingSteps(error);
        if (steps.length > 0) {
          // Add troubleshooting steps to operation log for reference
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
      setIsDownloadingUpdate(false);
    }
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleReboot = async (mode: 'normal' | 'fastboot') => {
    if (!daPath || !isConnected) return;

    setRebootDropdownOpen(false);

    try {
      await DeviceApi.reboot(daPath, mode, preloaderPath || undefined);
      toast.success(`Device rebooting to ${mode} mode`);
      
      // Disconnect after successful reboot
      disconnect();
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Reboot');
    }
  };

  const handleShutdown = async () => {
    if (!daPath || !isConnected) return;

    setRebootDropdownOpen(false);

    const confirmed = await confirm({
      title: 'Shutdown Device',
      message: 'Are you sure you want to shut down the device?',
      variant: 'warning',
      confirmText: 'Shutdown',
    });

    if (!confirmed) {
      toast('Shutdown cancelled', { icon: 'ℹ️' });
      return;
    }

    try {
      await DeviceApi.shutdown(daPath, preloaderPath || undefined);
      toast.success('Device shutting down');
      
      // Disconnect after successful shutdown
      disconnect();
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Shutdown');
    }
  };

  const handleFastBackup = async () => {
    if (!daPath || !isConnected) return;
    
    if (!defaultOutputPath) {
      toast.error('Please set a default output path first');
      return;
    }

    const availablePartitions = partitions.filter(p => 
      CRITICAL_PARTITIONS.includes(p.name.toLowerCase())
    );
    
    if (availablePartitions.length === 0) {
      toast.error('None of the critical partitions found on device');
      return;
    }

    const confirmed = await confirm({
      title: 'Backup NVRAM',
      message: `This will backup ${availablePartitions.length} critical partitions (${availablePartitions.map(p => p.name).join(', ')}) to your default output folder.\n\nContinue?`,
      variant: 'info',
      confirmText: 'Backup',
    });

    if (!confirmed) {
      toast('Backup cancelled', { icon: 'ℹ️' });
      return;
    }

    openLogPanel();
    clearLogs();
    setIsFastBackupRunning(true);
    backupCancelReasonRef.current = null;

    // Create abort controller for cancellation
    const abortController = new AbortController();
    setBackupAbortController(abortController);

    addLog({ 
      timestamp: new Date().toISOString(), 
      level: 'info', 
      message: `Starting Backup NVRAM for ${availablePartitions.length} partitions...` 
    });

    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < availablePartitions.length; i++) {
      // Check if backup was cancelled
      if (abortController.signal.aborted) {
        const reasonMessage =
          backupCancelReasonRef.current === 'disconnect'
            ? 'Backup stopped after current partition because the device disconnected'
            : 'Backup cancelled by user';
        addLog({
          timestamp: new Date().toISOString(),
          level: 'warning',
          message: reasonMessage,
        });
        toast(reasonMessage, { icon: 'ℹ️' });
        break;
      }

      const partition = availablePartitions[i];
      const filename = generateTimestampedFilename(partition.name, 'img');
      const outputPath = joinPath(defaultOutputPath, filename);
      
      const operationId = uuidv4();
      const result = await executeOperation({
        operation: `Backup ${partition.name}`,
        type: 'read',
        partitionName: partition.name,
        partitionSize: partition.display_size,
        operationId,
        clearLogs: false,
        openLogPanel: false,
        handleSuccess: false,
        errorOptions: {
          showToast: false,
        },
        run: (opId) =>
          PartitionApi.read({
            daPath,
            partition: partition.name,
            outputPath,
            preloaderPath: preloaderPath || undefined,
            operationId: opId,
          }),
      });
      if (!result.success) {
        failCount++;
        toast.error(`✗ ${partition.name} failed`);
        continue;
      }
      successCount++;
      toast.success(`✓ ${partition.name} (${i + 1}/${availablePartitions.length})`);
    }

    if (failCount === 0) {
      toast.success(`Backup complete! ${successCount} partitions backed up`);
    } else {
      toast(`Backup complete: ${successCount} succeeded, ${failCount} failed`, {
        icon: '⚠️',
      });
    }
    
    setIsFastBackupRunning(false);
    setBackupAbortController(null);
  };

  const handleRead = (partition: Partition) => {
    setModalState({
      isOpen: true,
      partition,
      operation: 'read',
    });
  };

  const handleWrite = (partition: Partition) => {
    setModalState({
      isOpen: true,
      partition,
      operation: 'write',
    });
  };

  const handleFormat = async (partition: Partition) => {
    const confirmed = await confirm({
      title: '⚠️ Format Partition',
      message: `This will FORMAT the "${partition.name}" partition.\n\nAll data will be permanently erased!\n\nContinue?`,
      variant: 'danger',
      confirmText: 'Format',
    });

    if (!confirmed) {
      toast('Format cancelled', { icon: 'ℹ️' });
      return;
    }

    openLogPanel();
    await formatPartition(partition);
  };

  const handleErase = async (partition: Partition) => {
    const confirmed = await confirm({
      title: '⚠️ Erase Partition',
      message: `This will ERASE the "${partition.name}" partition.\n\nAll data will be permanently deleted!\n\nContinue?`,
      variant: 'danger',
      confirmText: 'Erase',
    });

    if (!confirmed) {
      toast('Erase cancelled', { icon: 'ℹ️' });
      return;
    }

    openLogPanel();
    await erasePartition(partition);
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      partition: null,
      operation: 'read',
    });
  };

  return (
    <div className="h-screen bg-zinc-900 text-zinc-100 flex flex-col">
      <DashboardHeader
        daPath={daPath}
        preloaderPath={preloaderPath}
        defaultOutputPath={defaultOutputPath}
        isSettingsLoading={isSettingsLoading}
        isCheckingUpdate={isCheckingUpdate}
        onSelectDa={handleSelectDa}
        onSelectPreloader={handleSelectPreloader}
        onClearPreloader={handleClearPreloader}
        onSelectOutput={handleSelectOutput}
        onClearOutput={handleClearOutput}
        onCheckUpdates={handleCheckUpdates}
      />

      <main className="flex-1 overflow-hidden p-6">
        {!isConnected && (
          <ConnectionPanel
            isConnecting={isConnecting}
            isSettingsLoading={isSettingsLoading}
            daPath={daPath}
            onConnect={handleConnect}
          />
        )}

        <PartitionSection
          isConnected={isConnected}
          isConnecting={isConnecting}
          isFastBackupRunning={isFastBackupRunning}
          rebootDropdownOpen={rebootDropdownOpen}
          rebootDropdownRef={rebootDropdownRef}
          partitions={partitions}
          onFastBackup={handleFastBackup}
          onToggleRebootDropdown={() => setRebootDropdownOpen(!rebootDropdownOpen)}
          onRebootNormal={() => handleReboot('normal')}
          onRebootFastboot={() => handleReboot('fastboot')}
          onShutdown={handleShutdown}
          onRead={handleRead}
          onWrite={handleWrite}
          onFormat={handleFormat}
          onErase={handleErase}
        />
      </main>

      <OperationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        partition={modalState.partition}
        operation={modalState.operation}
      />

      <UpdateAvailableModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        onDownload={handleDownloadUpdate}
        updateInfo={updateInfo}
        isDownloading={isDownloadingUpdate}
      />

    </div>
  );
}
