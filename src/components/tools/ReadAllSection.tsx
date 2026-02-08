import { FolderOpen, HardDrive } from 'lucide-react';
import type { Partition } from '../../types';

interface ReadAllSectionProps {
  isConnected: boolean;
  isReadAllRunning: boolean;
  isSettingsLoading: boolean;
  partitions: Partition[];
  skipPartitions: Set<string>;
  backupCount: number;
  onSelectAllSkip: () => void;
  onClearAllSkip: () => void;
  onToggleSkip: (partitionName: string) => void;
  onReadAll: () => void;
}

export function ReadAllSection({
  isConnected,
  isReadAllRunning,
  isSettingsLoading,
  partitions,
  skipPartitions,
  backupCount,
  onSelectAllSkip,
  onClearAllSkip,
  onToggleSkip,
  onReadAll,
}: ReadAllSectionProps) {
  return (
    <section className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-blue-600/20 rounded-lg">
          <HardDrive className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-zinc-200">Backup All Partitions</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Create a complete backup of all device partitions to a directory. You can select which partitions to skip.
          </p>
        </div>
      </div>

      {isConnected && partitions.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-300">
              Select Partitions to Skip ({skipPartitions.size} skipped, {backupCount} will be backed up)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={onSelectAllSkip}
                className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              >
                Skip All
              </button>
              <button
                onClick={onClearAllSkip}
                className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {partitions.map((partition) => {
              const isSkipped = skipPartitions.has(partition.name);
              return (
                <button
                  key={partition.name}
                  onClick={() => onToggleSkip(partition.name)}
                  className={`px-3 py-2 text-sm rounded transition-colors text-left ${
                    isSkipped
                      ? 'bg-red-600/20 border border-red-600/50 text-red-400'
                      : 'bg-green-600/20 border border-green-600/50 text-green-400'
                  }`}
                >
                  <span className="font-mono">{partition.name}</span>
                  <span className="text-xs block text-zinc-500 mt-0.5">
                    {partition.display_size || partition.size}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onReadAll}
        disabled={!isConnected || isReadAllRunning || backupCount === 0 || isSettingsLoading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FolderOpen className="w-5 h-5" />
        {isReadAllRunning ? 'Backing up...' : `Backup ${backupCount} Partitions`}
      </button>
    </section>
  );
}
