import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { useOperationStore } from '../store/operationStore';
import { useConfirmation } from '../hooks/useConfirmation';
import { useFileSelection } from '../hooks/useFileSelection';
import { DialogType } from '../services/dialogs/fileDialogService';
import { PartitionApi } from '../services/api/partitionApi';
import { DeviceApi } from '../services/api/deviceApi';
import { FastbootApi } from '../services/api/fastbootApi';
import { FastbootToolsApi } from '../services/api/fastbootToolsApi';
import { executeOperation } from '../services/operations/executeOperation';
import { ToolsHeader } from '../components/tools/ToolsHeader';
import { ConnectionWarning } from '../components/tools/ConnectionWarning';
import { ReadAllSection } from '../components/tools/ReadAllSection';
import { BootloaderSection } from '../components/tools/BootloaderSection';
import { FastbootSection } from '../components/tools/FastbootSection';
import { FastbootToolsSection } from '../components/tools/FastbootToolsSection';
import type { FastbootStatusEvent } from '../types';
import type { FastbootDevice, FastbootRebootMode } from '../types';
import toast from 'react-hot-toast';

export function Tools() {
  const { daPath, preloaderPath, isConnected, isSettingsLoading } = useDeviceStore();
  const { partitions } = usePartitionStore();
  const { addLog, clearLogs } = useOperationStore();
  const { confirm } = useConfirmation();
  const { selectFile } = useFileSelection();

  const [isReadAllRunning, setIsReadAllRunning] = useState(false);
  const [isSeccfgRunning, setIsSeccfgRunning] = useState(false);
  const [isFastbootRunning, setIsFastbootRunning] = useState(false);
  const [isFastbootRefreshing, setIsFastbootRefreshing] = useState(false);
  const [isFastbootGetvarRunning, setIsFastbootGetvarRunning] = useState(false);
  const [isFastbootFlashRunning, setIsFastbootFlashRunning] = useState(false);
  const [isFastbootRebootRunning, setIsFastbootRebootRunning] = useState(false);
  const [fastbootDevices, setFastbootDevices] = useState<FastbootDevice[]>([]);
  const [selectedFastbootDeviceId, setSelectedFastbootDeviceId] = useState('');
  const [fastbootPartition, setFastbootPartition] = useState('');
  const [fastbootImagePath, setFastbootImagePath] = useState<string | null>(null);
  const [skipPartitions, setSkipPartitions] = useState<Set<string>>(new Set());
  const fastbootToastId = useRef<string | undefined>(undefined);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let isMounted = true;

    const setupListener = async () => {
      unlisten = await listen<FastbootStatusEvent>('fastboot:status', (event) => {
        if (!isMounted) return;
        const { status, message } = event.payload;

        if (status === 'start') {
          fastbootToastId.current = toast.loading(message);
          setIsFastbootRunning(true);
          return;
        }

        const toastId = fastbootToastId.current;
        if (status === 'success') {
          toast.success(message, { id: toastId });
        } else {
          toast.error(message, { id: toastId });
        }
        fastbootToastId.current = undefined;
        setIsFastbootRunning(false);
      });
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      setIsFastbootRefreshing(true);
      try {
        const devices = await FastbootToolsApi.listDevices();
        setFastbootDevices(devices);
        setSelectedFastbootDeviceId((current) =>
          devices.some((device) => device.id === current) ? current : ''
        );
      } catch {
        toast.error('Failed to list fastboot devices');
      } finally {
        setIsFastbootRefreshing(false);
      }
    };

    loadDevices();
  }, []);

  const handleSelectAllSkip = () => {
    setSkipPartitions(new Set(partitions.map(p => p.name)));
  };

  const handleClearAllSkip = () => {
    setSkipPartitions(new Set());
  };

  const handleToggleSkip = (partitionName: string) => {
    const next = new Set(skipPartitions);
    if (next.has(partitionName)) {
      next.delete(partitionName);
    } else {
      next.add(partitionName);
    }
    setSkipPartitions(next);
  };

  const handleReadAll = async () => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    // Select output directory
    const outputDir = await selectFile(DialogType.BACKUP_FOLDER);
    if (!outputDir) return;

    const skipList = Array.from(skipPartitions);
    const backupCount = partitions.length - skipList.length;

    const confirmed = await confirm({
      title: 'Backup All Partitions',
      message: (
        <div>
          <p>This will backup {backupCount} partitions to:</p>
          <p className="font-mono text-sm bg-[var(--surface-alt)] p-2 rounded mt-2">{outputDir}</p>
          {skipList.length > 0 && (
            <p className="mt-2 text-[var(--text-muted)]">
              Skipping {skipList.length} partitions: {skipList.join(', ')}
            </p>
          )}
          <p className="mt-3">Continue?</p>
        </div>
      ),
      variant: 'info',
      confirmText: 'Backup',
    });

    if (!confirmed) {
      toast('Backup cancelled', { icon: 'ℹ️' });
      return;
    }

    setIsReadAllRunning(true);

    try {
      const result = await executeOperation({
        operation: 'Read all partitions',
        type: 'read',
        partitionName: 'all-partitions',
        partitionSize: `${backupCount} partitions`,
        successMessage: `Backup complete! ${backupCount} partitions backed up`,
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Starting read-all backup (${backupCount} partitions)...`,
          });
        },
        run: (operationId) =>
          PartitionApi.readAll(
            daPath,
            outputDir,
            skipList,
            preloaderPath || undefined,
            operationId
          ),
      });
      if (!result.success) return;
    } finally {
      setIsReadAllRunning(false);
    }
  };

  const handleSeccfg = async (action: 'unlock' | 'lock') => {
    if (!daPath || !isConnected) {
      toast.error('Please connect to device first');
      return;
    }

    const isUnlock = action === 'unlock';
    
    const confirmed = await confirm({
      title: isUnlock ? '⚠️ Unlock Bootloader' : '⚠️ Lock Bootloader',
      message: isUnlock ? (
        <div>
          <p className="font-semibold text-[var(--danger)] mb-2">WARNING: UNLOCKING THE BOOTLOADER</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>This may WIPE ALL DATA on your device</li>
            <li>Your warranty may be voided</li>
            <li>Security features will be disabled</li>
          </ul>
          <p className="mt-3">Are you absolutely sure you want to continue?</p>
        </div>
      ) : (
        <div>
          <p className="font-semibold text-[var(--danger)] mb-2">WARNING: LOCKING THE BOOTLOADER</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>This may WIPE ALL DATA on your device</li>
            <li>You will not be able to flash custom ROMs</li>
            <li>Security features will be re-enabled</li>
          </ul>
          <p className="mt-3">Are you absolutely sure you want to continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: isUnlock ? 'Unlock' : 'Lock',
    });

    if (!confirmed) {
      toast('Operation cancelled', { icon: 'ℹ️' });
      return;
    }

    setIsSeccfgRunning(true);

    try {
      await executeOperation({
        operation: `Seccfg ${action}`,
        type: 'write',
        partitionName: `seccfg-${action}`,
        partitionSize: 'bootloader',
        successMessage: `Bootloader ${action}ed successfully!`,
        errorMessage: `Failed to ${action} bootloader`,
        onStart: () => {
          addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Starting seccfg ${action}...`,
          });
        },
        run: (operationId) =>
          DeviceApi.seccfgOperation(
            daPath,
            action,
            preloaderPath || undefined,
            operationId
          ),
      });
    } finally {
      setIsSeccfgRunning(false);
    }
  };

  const handleForceFastboot = async () => {
    if (isFastbootRunning) return;

    clearLogs();
    setIsFastbootRunning(true);
    try {
      await FastbootApi.forceFastboot();
    } catch {
      toast.error('Failed to start fastboot attempt');
    } finally {
      setIsFastbootRunning(false);
    }
  };

  const handleRefreshFastbootDevices = async () => {
    setIsFastbootRefreshing(true);
    try {
      const devices = await FastbootToolsApi.listDevices();
      setFastbootDevices(devices);
      if (devices.length === 0) {
        setSelectedFastbootDeviceId('');
        toast.error('No fastboot devices detected');
      }
    } catch {
      toast.error('Failed to list fastboot devices');
    } finally {
      setIsFastbootRefreshing(false);
    }
  };

  const ensureFastbootDevice = () => {
    if (!selectedFastbootDeviceId) {
      toast.error('Select a fastboot device first');
      return false;
    }
    return true;
  };

  const handleGetvarAll = async () => {
    if (!ensureFastbootDevice()) return;
    if (isFastbootGetvarRunning) return;

    setIsFastbootGetvarRunning(true);
    try {
      await executeOperation({
        operation: 'Fastboot getvar all',
        type: 'read',
        partitionName: 'fastboot',
        partitionSize: 'vars',
        successMessage: 'Fastboot variables fetched',
        run: (operationId) =>
          FastbootToolsApi.getvarAll(selectedFastbootDeviceId, operationId).then(() => undefined),
      });
    } finally {
      setIsFastbootGetvarRunning(false);
    }
  };

  const handleSelectFastbootImage = async () => {
    const imagePath = await selectFile(DialogType.IMAGE_FILE);
    if (!imagePath) return;
    setFastbootImagePath(imagePath);
  };

  const handleFastbootFlash = async () => {
    if (!ensureFastbootDevice()) return;
    if (!fastbootPartition.trim() || !fastbootImagePath) {
      toast.error('Select a partition and image file first');
      return;
    }
    if (isFastbootFlashRunning) return;

    setIsFastbootFlashRunning(true);
    try {
      await executeOperation({
        operation: `Fastboot flash ${fastbootPartition}`,
        type: 'write',
        partitionName: fastbootPartition,
        partitionSize: 'image',
        successMessage: `Flashed ${fastbootPartition} successfully`,
        run: (operationId) =>
          FastbootToolsApi.flash(
            selectedFastbootDeviceId,
            fastbootPartition.trim(),
            fastbootImagePath,
            operationId
          ),
      });
    } finally {
      setIsFastbootFlashRunning(false);
    }
  };

  const handleFastbootReboot = async (mode: FastbootRebootMode) => {
    if (!ensureFastbootDevice()) return;
    if (isFastbootRebootRunning) return;

    setIsFastbootRebootRunning(true);
    try {
      await executeOperation({
        operation: `Fastboot reboot (${mode})`,
        type: 'write',
        partitionName: 'fastboot',
        partitionSize: mode,
        successMessage: `Rebooted to ${mode}`,
        run: (operationId) =>
          FastbootToolsApi.reboot(selectedFastbootDeviceId, mode, operationId),
      });
    } finally {
      setIsFastbootRebootRunning(false);
    }
  };

  const backupCount = partitions.length - skipPartitions.size;

  return (
    <div className="h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      <ToolsHeader />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {!isConnected && <ConnectionWarning />}

        <ReadAllSection
          isConnected={isConnected}
          isReadAllRunning={isReadAllRunning}
          isSettingsLoading={isSettingsLoading}
          partitions={partitions}
          skipPartitions={skipPartitions}
          backupCount={backupCount}
          onSelectAllSkip={handleSelectAllSkip}
          onClearAllSkip={handleClearAllSkip}
          onToggleSkip={handleToggleSkip}
          onReadAll={handleReadAll}
        />

        <BootloaderSection
          isConnected={isConnected}
          isSeccfgRunning={isSeccfgRunning}
          isSettingsLoading={isSettingsLoading}
          onUnlock={() => handleSeccfg('unlock')}
          onLock={() => handleSeccfg('lock')}
        />

        <FastbootSection
          isRunning={isFastbootRunning}
          onForceFastboot={handleForceFastboot}
        />

        <FastbootToolsSection
          devices={fastbootDevices}
          selectedDeviceId={selectedFastbootDeviceId}
          isRefreshing={isFastbootRefreshing}
          isGetvarRunning={isFastbootGetvarRunning}
          isFlashRunning={isFastbootFlashRunning}
          isRebootRunning={isFastbootRebootRunning}
          flashImagePath={fastbootImagePath}
          flashPartition={fastbootPartition}
          onSelectDevice={setSelectedFastbootDeviceId}
          onRefresh={handleRefreshFastbootDevices}
          onGetvarAll={handleGetvarAll}
          onSelectFlashImage={handleSelectFastbootImage}
          onFlashPartitionChange={setFastbootPartition}
          onFlash={handleFastbootFlash}
          onReboot={handleFastbootReboot}
        />

      </main>

    </div>
  );
}
