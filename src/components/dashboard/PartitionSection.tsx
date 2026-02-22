import { ChevronDown } from 'lucide-react';
import type { Partition } from '../../types';
import { PartitionSkeleton } from '../PartitionSkeleton';
import { PartitionTable } from '../PartitionTable';

interface PartitionSectionProps {
  isConnected: boolean;
  isConnecting: boolean;
  isFastBackupRunning: boolean;
  rebootDropdownOpen: boolean;
  rebootDropdownRef: React.RefObject<HTMLDivElement | null>;
  partitions: Partition[];
  onFastBackup: () => void;
  onToggleRebootDropdown: () => void;
  onRebootNormal: () => void;
  onRebootFastboot: () => void;
  onShutdown: () => void;
  onRead: (partition: Partition) => void;
  onWrite: (partition: Partition) => void;
  onFormat: (partition: Partition) => void;
  onErase: (partition: Partition) => void;
}

export function PartitionSection({
  isConnected,
  isConnecting,
  isFastBackupRunning,
  rebootDropdownOpen,
  rebootDropdownRef,
  partitions,
  onFastBackup,
  onToggleRebootDropdown,
  onRebootNormal,
  onRebootFastboot,
  onShutdown,
  onRead,
  onWrite,
  onFormat,
  onErase,
}: PartitionSectionProps) {
  if (!isConnected && !isConnecting) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold text-[var(--text)]">Partition Table</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onFastBackup}
            disabled={!isConnected || isConnecting || isFastBackupRunning}
            className="px-4 py-2 bg-[var(--warning)] hover:bg-[var(--warning-hover)] text-[var(--warning-foreground)] rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFastBackupRunning ? 'Backing up...' : 'Backup NVRAM'}
          </button>

          <div className="relative" ref={rebootDropdownRef}>
            <button
              onClick={onToggleRebootDropdown}
              disabled={!isConnected || isConnecting}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Reboot
              <ChevronDown className="w-4 h-4" />
            </button>
            {rebootDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  onClick={onRebootNormal}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Normal
                </button>
                <button
                  onClick={onRebootFastboot}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Fastboot
                </button>
                <div className="border-t border-[var(--border)]" />
                <button
                  onClick={onShutdown}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Shutdown
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isConnecting ? (
          <PartitionSkeleton />
        ) : (
          <PartitionTable
            partitions={partitions}
            onRead={onRead}
            onWrite={onWrite}
            onFormat={onFormat}
            onErase={onErase}
          />
        )}
      </div>
    </div>
  );
}
