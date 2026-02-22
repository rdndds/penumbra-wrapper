import { CheckSquare, Square, FolderOpen } from 'lucide-react';
import type { ScatterPartition } from '../../types';
import { getBasename } from '../../services/utils/pathUtils';
import { formatHexSize } from '../../services/utils/formatUtils';

interface FlashPartitionTableProps {
  partitions: ScatterPartition[];
  selectedPartitions: Set<string>;
  partitionImages: Map<string, string>;
  onTogglePartition: (partitionName: string) => void;
  onSelectImage: (partitionName: string) => void;
}

export function FlashPartitionTable({
  partitions,
  selectedPartitions,
  partitionImages,
  onTogglePartition,
  onSelectImage,
}: FlashPartitionTableProps) {
  return (
    <div className="flex-1 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg overflow-hidden flex flex-col mb-4">
      <div className="grid grid-cols-[auto_2fr_1fr_1fr_1.5fr_2fr] gap-4 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="text-sm font-semibold text-[var(--text)]">Select</div>
        <div className="text-sm font-semibold text-[var(--text)]">Partition</div>
        <div className="text-sm font-semibold text-[var(--text)]">Size</div>
        <div className="text-sm font-semibold text-[var(--text)]">Region</div>
        <div className="text-sm font-semibold text-[var(--text)]">Type</div>
        <div className="text-sm font-semibold text-[var(--text)]">Image File</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {partitions.map((partition) => {
          const isSelected = selectedPartitions.has(partition.partition_name);
          const imageFile = partitionImages.get(partition.partition_name);

          return (
            <div
              key={partition.partition_name}
              className={`grid grid-cols-[auto_2fr_1fr_1fr_1.5fr_2fr] gap-4 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors ${
                isSelected ? 'bg-[var(--accent-soft)]' : ''
              }`}
            >
              <div className="flex items-center">
                <button
                  onClick={() => onTogglePartition(partition.partition_name)}
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center min-w-0">
                <div className="flex flex-col min-w-0">
                  <span
                    className="font-mono text-sm text-[var(--text)] truncate"
                    title={partition.partition_name}
                  >
                    {partition.partition_name}
                  </span>
                  {partition.file_name && (
                    <span
                      className="text-xs text-[var(--text-subtle)] font-mono truncate"
                      title={partition.file_name}
                    >
                      {partition.file_name}
                    </span>
                  )}
                </div>
              </div>

              <div
                className="flex items-center font-mono text-sm text-[var(--text)] truncate"
                title={partition.partition_size}
              >
                {formatHexSize(partition.partition_size)}
              </div>

              <div
                className="flex items-center font-mono text-sm text-[var(--text-muted)] truncate"
                title={partition.region}
              >
                {partition.region}
              </div>

              <div
                className="flex items-center font-mono text-xs text-[var(--text-subtle)] truncate"
                title={partition.operation_type}
              >
                {partition.operation_type}
              </div>

              <div className="flex items-center min-w-0">
                {imageFile ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-[var(--success)] truncate font-mono" title={imageFile}>
                      {getBasename(imageFile)}
                    </span>
                    <button
                      onClick={() => onSelectImage(partition.partition_name)}
                      className="flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      title="Change image file"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectImage(partition.partition_name)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] rounded transition-colors border border-[var(--border)]"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Select File
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
