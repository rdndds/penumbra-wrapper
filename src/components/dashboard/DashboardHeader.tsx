import { FolderOpen, Download } from 'lucide-react';
import { getBasename } from '../../services/utils/pathUtils';

interface DashboardHeaderProps {
  daPath: string | null;
  preloaderPath: string | null;
  defaultOutputPath: string | null;
  isSettingsLoading: boolean;
  isCheckingUpdate?: boolean;
  onSelectDa: () => void;
  onSelectPreloader: () => void;
  onClearPreloader: () => void;
  onSelectOutput: () => void;
  onClearOutput: () => void;
  onCheckUpdates?: () => void;
}

export function DashboardHeader({
  daPath,
  preloaderPath,
  defaultOutputPath,
  isSettingsLoading,
  isCheckingUpdate = false,
  onSelectDa,
  onSelectPreloader,
  onClearPreloader,
  onSelectOutput,
  onClearOutput,
  onCheckUpdates,
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-zinc-800 p-4 bg-zinc-900/95 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {onCheckUpdates && (
          <button
            onClick={onCheckUpdates}
            disabled={isCheckingUpdate}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isCheckingUpdate ? 'Checking...' : 'Update Antumbra'}
          </button>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 font-medium">DA:</label>
            <button
              onClick={onSelectDa}
              disabled={isSettingsLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-4 h-4" />
              {daPath ? getBasename(daPath) : 'Select DA'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 font-medium">Preloader:</label>
            <button
              onClick={onSelectPreloader}
              disabled={isSettingsLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-4 h-4" />
              {preloaderPath ? getBasename(preloaderPath) : 'Optional'}
            </button>
            {preloaderPath && (
              <button
                onClick={onClearPreloader}
                disabled={isSettingsLoading}
                className="px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 font-medium">Output:</label>
            <button
              onClick={onSelectOutput}
              disabled={isSettingsLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-4 h-4" />
              {defaultOutputPath ? getBasename(defaultOutputPath) : 'Select Output'}
            </button>
            {defaultOutputPath && (
              <button
                onClick={onClearOutput}
                disabled={isSettingsLoading}
                className="px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
