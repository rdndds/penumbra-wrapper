import { getBasename } from '../../services/utils/pathUtils';
import type { ScatterFile } from '../../types';

interface ScatterInfoBarProps {
  scatterFile: ScatterFile;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function ScatterInfoBar({ scatterFile, onSelectAll, onClearAll }: ScatterInfoBarProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex-shrink-0 mb-4">
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-zinc-500">Platform:</span>{' '}
          <span className="font-mono text-zinc-300">{scatterFile.platform}</span>
        </div>
        <div>
          <span className="text-zinc-500">Project:</span>{' '}
          <span className="font-mono text-zinc-300">{scatterFile.project}</span>
        </div>
        <div>
          <span className="text-zinc-500">Storage:</span>{' '}
          <span className="font-mono text-zinc-300">{scatterFile.storage_type}</span>
        </div>
        <div>
          <span className="text-zinc-500">File:</span>{' '}
          <span className="font-mono text-zinc-300 text-xs">
            {getBasename(scatterFile.file_path)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSelectAll}
          className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
        >
          Select All
        </button>
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
