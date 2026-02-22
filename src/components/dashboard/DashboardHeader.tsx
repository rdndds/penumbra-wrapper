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
    <header className="border-b border-[var(--border)] p-4 bg-[var(--surface)] backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {onCheckUpdates && (
          <button
            onClick={onCheckUpdates}
            disabled={isCheckingUpdate}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] border border-[var(--primary)] rounded transition-colors text-sm text-[var(--primary-foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isCheckingUpdate ? 'Checking...' : 'Update Antumbra'}
          </button>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-muted)] font-medium">DA:</label>
            <button
              onClick={onSelectDa}
              disabled={isSettingsLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-4 h-4" />
              {daPath ? getBasename(daPath) : 'Select DA'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-muted)] font-medium">Preloader:</label>
            <button
              onClick={onSelectPreloader}
              disabled={isSettingsLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-4 h-4" />
              {preloaderPath ? getBasename(preloaderPath) : 'Optional'}
            </button>
            {preloaderPath && (
              <button
                onClick={onClearPreloader}
                disabled={isSettingsLoading}
                className="px-2 py-1.5 bg-[var(--danger)] hover:bg-[var(--danger-hover)] rounded transition-colors text-sm text-[var(--danger-foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-muted)] font-medium">Output:</label>
            <button
              onClick={onSelectOutput}
              disabled={isSettingsLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-4 h-4" />
              {defaultOutputPath ? getBasename(defaultOutputPath) : 'Select Output'}
            </button>
            {defaultOutputPath && (
              <button
                onClick={onClearOutput}
                disabled={isSettingsLoading}
                className="px-2 py-1.5 bg-[var(--danger)] hover:bg-[var(--danger-hover)] rounded transition-colors text-sm text-[var(--danger-foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
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
