import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import type { AntumbraUpdateInfo, DownloadProgress } from '../types';

export interface UpdateAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  updateInfo: AntumbraUpdateInfo | null;
  isDownloading?: boolean;
  downloadProgress?: DownloadProgress | null;
}

export function UpdateAvailableModal({
  isOpen,
  onClose,
  onDownload,
  updateInfo,
  isDownloading = false,
  downloadProgress = null,
}: UpdateAvailableModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Handle fade in animation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setIsVisible(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDownloading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDownloading]);

  if (!isVisible && !isOpen) return null;
  if (!updateInfo || !updateInfo.supported) return null;

  const isFirstInstall = !updateInfo.installed_path || !updateInfo.installed_version;
  const shouldRender = updateInfo.update_available || isFirstInstall;

  if (!shouldRender) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'downloading':
      case 'fetching':
        return 'text-[var(--primary)]';
      case 'verifying':
        return 'text-[var(--warning)]';
      case 'completed':
        return 'text-[var(--success)]';
      case 'failed':
        return 'text-[var(--danger)]';
      case 'retrying':
      case 'fallback_blocking':
      case 'fallback_curl':
      case 'fallback_powershell':
        return 'text-[var(--warning)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'downloading' || status === 'fetching' || status === 'verifying' || status === 'replacing') {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    return null;
  };

  const titleText = isFirstInstall ? 'Antumbra Required' : 'Antumbra Update Available';
  const primaryActionText = isFirstInstall ? 'Download Antumbra' : 'Download Update';
  const messageText = isFirstInstall
    ? 'Antumbra is required to connect to devices. Download it now?'
    : 'A newer antumbra build is available. Download now?';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={!isDownloading ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-lg mx-4 transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="bg-[var(--surface)] rounded-lg border-2 border-[var(--primary)] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-[var(--border)]">
            <Download className="w-6 h-6 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <h2 className="text-xl font-semibold text-[var(--text)] flex-1">{titleText}</h2>
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="p-1 hover:bg-[var(--surface-alt)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 text-[var(--text)] space-y-4">
            <p className="text-sm text-[var(--text-muted)]">{messageText}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Installed:</span>
                <span className="font-mono text-sm">
                  {isFirstInstall ? 'Not installed' : updateInfo.installed_version || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Latest:</span>
                <span className="font-mono text-sm text-[var(--primary)]">
                  {updateInfo.latest_version || 'Unknown'}
                </span>
              </div>
            </div>

            {updateInfo.installed_path && (
              <div className="text-sm">
                <span className="text-[var(--text-muted)]">Install location:</span>
                <div className="mt-1 font-mono text-xs bg-[var(--surface-alt)] p-2 rounded overflow-x-auto">
                  {updateInfo.installed_path}
                </div>
              </div>
            )}

            {/* Download Progress */}
            {isDownloading && downloadProgress && (
              <div className="space-y-3 p-4 bg-[var(--surface-alt)] rounded-lg border border-[var(--border)]">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(downloadProgress.status)}`}>
                    {getStatusIcon(downloadProgress.status)}
                    <span>{downloadProgress.message}</span>
                  </div>
                  {downloadProgress.attempt > 1 && (
                    <span className="text-xs text-[var(--text-subtle)]">
                      Attempt {downloadProgress.attempt}/{downloadProgress.max_attempts}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <div className="h-2 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--primary)] transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="flex items-center justify-between text-xs text-[var(--text-subtle)]">
                  <span>
                    {downloadProgress.total_bytes > 0 
                      ? `${formatBytes(downloadProgress.bytes_downloaded)} / ${formatBytes(downloadProgress.total_bytes)}`
                      : downloadProgress.bytes_downloaded > 0
                        ? formatBytes(downloadProgress.bytes_downloaded)
                        : 'Starting...'
                    }
                  </span>
                  <span>{downloadProgress.percentage.toFixed(1)}%</span>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border)] bg-[var(--surface)]">
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="px-5 py-2 bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] text-[var(--text)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Later
            </button>
            <button
              onClick={onDownload}
              disabled={isDownloading || !updateInfo.supported}
              className="px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Downloading...' : primaryActionText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
