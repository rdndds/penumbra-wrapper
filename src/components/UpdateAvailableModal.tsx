import { useEffect, useState } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';
import type { AntumbraUpdateInfo } from '../types';

export interface UpdateAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  updateInfo: AntumbraUpdateInfo | null;
  isDownloading?: boolean;
}

export function UpdateAvailableModal({
  isOpen,
  onClose,
  onDownload,
  updateInfo,
  isDownloading = false,
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
  if (!updateInfo || !updateInfo.update_available) return null;

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
            <h2 className="text-xl font-semibold text-zinc-100 flex-1">Antumbra Update Available</h2>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Installed:</span>
                <span className="font-mono text-sm">{updateInfo.installed_version || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Latest:</span>
                <span className="font-mono text-sm text-blue-400">{updateInfo.latest_version}</span>
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

            {!updateInfo.supported && updateInfo.message && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">{updateInfo.message}</p>
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
              {isDownloading ? 'Downloading...' : 'Download Update'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
