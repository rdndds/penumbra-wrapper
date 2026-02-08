import { Download, RefreshCw } from 'lucide-react';
import type { AntumbraUpdateInfo } from '../../types';

interface AntumbraUpdatesSectionProps {
  updateInfo: AntumbraUpdateInfo | null;
  updatablePath: string | null;
  isCheckingUpdate: boolean;
  isUpdatingAntumbra: boolean;
  onCheckUpdates: () => void;
  onUpdateAntumbra: () => void;
}

export function AntumbraUpdatesSection({
  updateInfo,
  updatablePath,
  isCheckingUpdate,
  isUpdatingAntumbra,
  onCheckUpdates,
  onUpdateAntumbra,
}: AntumbraUpdatesSectionProps) {
  return (
    <section className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-emerald-600/20 rounded-lg">
          <Download className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-zinc-200">Antumbra Updates</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Check for updates and install the latest antumbra release.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Installed</p>
          <p className="mt-2 text-sm font-mono text-zinc-200">
            {updateInfo?.installed_version || 'Unknown'}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Latest</p>
          <p className="mt-2 text-sm font-mono text-zinc-200">
            {updateInfo?.latest_version || 'Unknown'}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
          <p className="mt-2 text-sm font-semibold text-zinc-200">
            {updateInfo?.supported === false
              ? 'Unsupported'
              : updateInfo?.update_available
                ? 'Update available'
                : 'Up to date'}
          </p>
          {updateInfo?.message && (
            <p className="text-xs text-zinc-500 mt-1">{updateInfo.message}</p>
          )}
        </div>
      </div>

      {updatablePath && (
        <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 mb-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Update path</p>
          <p className="mt-2 text-xs font-mono text-zinc-300 break-all">{updatablePath}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={onCheckUpdates}
          disabled={isCheckingUpdate}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
          {isCheckingUpdate ? 'Checking...' : 'Check for updates'}
        </button>
        <button
          onClick={onUpdateAntumbra}
          disabled={
            isUpdatingAntumbra ||
            isCheckingUpdate ||
            !updateInfo?.supported ||
            !updateInfo?.update_available
          }
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {isUpdatingAntumbra ? 'Updating...' : 'Update Antumbra'}
        </button>
      </div>
    </section>
  );
}
