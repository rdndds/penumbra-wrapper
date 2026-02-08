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
        <h2 className="text-xl font-semibold text-zinc-200">Partition Table</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onFastBackup}
            disabled={!isConnected || isConnecting || isFastBackupRunning}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFastBackupRunning ? 'Backing up...' : 'Backup NVRAM'}
          </button>

          <div className="relative" ref={rebootDropdownRef}>
            <button
              onClick={onToggleRebootDropdown}
              disabled={!isConnected || isConnecting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Reboot
              <ChevronDown className="w-4 h-4" />
            </button>
            {rebootDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  onClick={onRebootNormal}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Normal
                </button>
                <button
                  onClick={onRebootFastboot}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Fastboot
                </button>
                <div className="border-t border-zinc-700" />
                <button
                  onClick={onShutdown}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 transition-colors"
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
