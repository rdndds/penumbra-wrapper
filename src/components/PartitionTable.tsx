import { useState, useCallback, useMemo, memo } from 'react';
import type { Partition } from '../types';
import { Download, Upload, Search, Trash2, HardDriveDownload } from 'lucide-react';
import toast from 'react-hot-toast';

interface PartitionTableProps {
  partitions: Partition[];
  onRead: (partition: Partition) => void;
  onWrite: (partition: Partition) => void;
  onFormat: (partition: Partition) => void;
  onErase: (partition: Partition) => void;
}

export const PartitionTable = memo<PartitionTableProps>(({
  partitions,
  onRead,
  onWrite,
  onFormat,
  onErase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize filtered partitions to avoid unnecessary re-computation
  const filteredPartitions = useMemo(
    () => partitions.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [partitions, searchTerm]
  );

  const handleCopyName = useCallback((name: string) => {
    navigator.clipboard.writeText(name);
    toast.success(`Copied "${name}" to clipboard`);
  }, []);

  // Memoize handler creators to avoid recreating on every render
  const createReadHandler = useCallback((partition: Partition) => () => onRead(partition), [onRead]);
  const createWriteHandler = useCallback((partition: Partition) => () => onWrite(partition), [onWrite]);
  const createFormatHandler = useCallback((partition: Partition) => () => onFormat(partition), [onFormat]);
  const createEraseHandler = useCallback((partition: Partition) => () => onErase(partition), [onErase]);

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search partitions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[var(--surface-hover)]"
        />
      </div>

      {/* Table Container with CSS Grid */}
      <div className="flex-1 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_3fr] gap-4 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
          <div className="text-sm font-semibold text-[var(--text)]">Name</div>
          <div className="text-sm font-semibold text-[var(--text)]">Start</div>
          <div className="text-sm font-semibold text-[var(--text)]">Size</div>
          <div className="text-sm font-semibold text-[var(--text)] text-center">Actions</div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {filteredPartitions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[var(--text-subtle)]">
              {searchTerm
                ? 'No partitions found matching your search'
                : 'No partitions available'}
            </div>
          ) : (
            filteredPartitions.map((partition) => (
              <div
                key={partition.name}
                className="grid grid-cols-[2fr_1.5fr_1.5fr_3fr] gap-4 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                {/* Name */}
                <div className="flex items-center">
                  <button
                    onClick={() => handleCopyName(partition.name)}
                    className="font-mono text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline text-left truncate"
                    title={partition.name}
                  >
                    {partition.name}
                  </button>
                </div>

                {/* Start */}
                <div className="flex items-center font-mono text-sm text-[var(--text-muted)] truncate" title={partition.start}>
                  {partition.start}
                </div>

                {/* Size */}
                <div className="flex items-center font-mono text-sm text-[var(--text-muted)] truncate" title={partition.size}>
                  {partition.display_size || partition.size}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={createReadHandler(partition)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] text-sm rounded transition-colors"
                    title="Read partition"
                  >
                    <Upload className="w-4 h-4" />
                    Read
                  </button>
                  <button
                    onClick={createWriteHandler(partition)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--success)] hover:bg-[var(--success-hover)] text-[var(--success-foreground)] text-sm rounded transition-colors"
                    title="Write partition"
                  >
                    <Download className="w-4 h-4" />
                    Write
                  </button>
                  <button
                    onClick={createFormatHandler(partition)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-[var(--danger-foreground)] text-sm rounded transition-colors"
                    title="Format partition"
                  >
                    <HardDriveDownload className="w-4 h-4" />
                    Format
                  </button>
                  <button
                    onClick={createEraseHandler(partition)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--warning)] hover:bg-[var(--warning-hover)] text-[var(--warning-foreground)] text-sm rounded transition-colors"
                    title="Erase partition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Erase
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Count */}
      <div className="text-sm text-[var(--text-subtle)] flex-shrink-0">
        Showing {filteredPartitions.length} of {partitions.length} partitions
      </div>
    </div>
  );
});
