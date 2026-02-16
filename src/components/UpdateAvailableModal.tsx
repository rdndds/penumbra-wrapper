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
        return 'text-blue-400';
      case 'verifying':
        return 'text-yellow-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'retrying':
      case 'fallback_blocking':
      case 'fallback_curl':
      case 'fallback_powershell':
        return 'text-amber-400';
      default:
        return 'text-zinc-400';
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
        <div className="bg-zinc-900 rounded-lg border-2 border-blue-500 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
            <Download className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <h2 className="text-xl font-semibold text-zinc-100 flex-1">{titleText}</h2>
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="p-1 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 text-zinc-300 space-y-4">
            <p className="text-sm text-zinc-400">{messageText}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Installed:</span>
                <span className="font-mono text-sm">
                  {isFirstInstall ? 'Not installed' : updateInfo.installed_version || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Latest:</span>
                <span className="font-mono text-sm text-blue-400">
                  {updateInfo.latest_version || 'Unknown'}
                </span>
              </div>
            </div>

            {updateInfo.installed_path && (
              <div className="text-sm">
                <span className="text-zinc-400">Install location:</span>
                <div className="mt-1 font-mono text-xs bg-zinc-800 p-2 rounded overflow-x-auto">
                  {updateInfo.installed_path}
                </div>
              </div>
            )}

            {/* Download Progress */}
            {isDownloading && downloadProgress && (
              <div className="space-y-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(downloadProgress.status)}`}>
                    {getStatusIcon(downloadProgress.status)}
                    <span>{downloadProgress.message}</span>
                  </div>
                  {downloadProgress.attempt > 1 && (
                    <span className="text-xs text-zinc-500">
                      Attempt {downloadProgress.attempt}/{downloadProgress.max_attempts}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="flex items-center justify-between text-xs text-zinc-500">
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
          <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Later
            </button>
            <button
              onClick={onDownload}
              disabled={isDownloading || !updateInfo.supported}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
