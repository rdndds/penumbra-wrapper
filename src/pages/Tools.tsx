import { useState } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { usePartitionStore } from '../store/partitionStore';
import { useOperationStore } from '../store/operationStore';
import { useConfirmation } from '../hooks/useConfirmation';
import { useFileSelection } from '../hooks/useFileSelection';
import { DialogType } from '../services/dialogs/fileDialogService';
import { PartitionApi } from '../services/api/partitionApi';
import { DeviceApi } from '../services/api/deviceApi';
import { executeOperation } from '../services/operations/executeOperation';
import { ToolsHeader } from '../components/tools/ToolsHeader';
import { ConnectionWarning } from '../components/tools/ConnectionWarning';
import { ReadAllSection } from '../components/tools/ReadAllSection';
import { BootloaderSection } from '../components/tools/BootloaderSection';
import toast from 'react-hot-toast';

export function Tools() {
  const { daPath, preloaderPath, isConnected, isSettingsLoading } = useDeviceStore();
  const { partitions } = usePartitionStore();
  const { addLog } = useOperationStore();
  const { confirm } = useConfirmation();
  const { selectFile } = useFileSelection();

  const [isReadAllRunning, setIsReadAllRunning] = useState(false);
  const [isSeccfgRunning, setIsSeccfgRunning] = useState(false);
  const [skipPartitions, setSkipPartitions] = useState<Set<string>>(new Set());

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

      </main>

    </div>
  );
}
