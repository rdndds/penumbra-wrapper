import { AlertTriangle, Lock, Unlock } from 'lucide-react';

interface BootloaderSectionProps {
  isConnected: boolean;
  isSeccfgRunning: boolean;
  isSettingsLoading: boolean;
  onUnlock: () => void;
  onLock: () => void;
}

export function BootloaderSection({
  isConnected,
  isSeccfgRunning,
  isSettingsLoading,
  onUnlock,
  onLock,
}: BootloaderSectionProps) {
  return (
    <section className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-amber-600/20 rounded-lg">
          <Lock className="w-6 h-6 text-amber-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-zinc-200">Bootloader Management</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Unlock or lock the device bootloader. <span className="text-amber-400 font-semibold">WARNING:</span> These operations may wipe all data!
          </p>
        </div>
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-zinc-300">
            <p className="font-semibold text-red-400 mb-1">Destructive Operations!</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>Unlocking allows custom ROM installation but may void warranty</li>
              <li>Locking prevents custom modifications but restores security</li>
              <li>Both operations typically wipe all user data</li>
              <li>Make sure you have backups before proceeding</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onUnlock}
          disabled={!isConnected || isSeccfgRunning || isSettingsLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Unlock className="w-5 h-5" />
          {isSeccfgRunning ? 'Processing...' : 'Unlock Bootloader'}
        </button>

        <button
          onClick={onLock}
          disabled={!isConnected || isSeccfgRunning || isSettingsLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="w-5 h-5" />
          {isSeccfgRunning ? 'Processing...' : 'Lock Bootloader'}
        </button>
      </div>
    </section>
  );
}
