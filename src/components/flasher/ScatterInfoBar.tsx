import { getBasename } from '../../services/utils/pathUtils';
import type { ScatterFile } from '../../types';

interface ScatterInfoBarProps {
  scatterFile: ScatterFile;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function ScatterInfoBar({ scatterFile, onSelectAll, onClearAll }: ScatterInfoBarProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-[var(--surface-alt)] rounded-lg border border-[var(--border)] flex-shrink-0 mb-4">
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-[var(--text-subtle)]">Platform:</span>{' '}
          <span className="font-mono text-[var(--text)]">{scatterFile.platform}</span>
        </div>
        <div>
          <span className="text-[var(--text-subtle)]">Project:</span>{' '}
          <span className="font-mono text-[var(--text)]">{scatterFile.project}</span>
        </div>
        <div>
          <span className="text-[var(--text-subtle)]">Storage:</span>{' '}
          <span className="font-mono text-[var(--text)]">{scatterFile.storage_type}</span>
        </div>
        <div>
          <span className="text-[var(--text-subtle)]">File:</span>{' '}
          <span className="font-mono text-[var(--text)] text-xs">
            {getBasename(scatterFile.file_path)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSelectAll}
          className="px-3 py-1.5 text-sm bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] rounded transition-colors border border-[var(--border)]"
        >
          Select All
        </button>
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 text-sm bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] rounded transition-colors border border-[var(--border)]"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
