import { IdleAnimation } from '../IdleAnimation';

interface ConnectionPanelProps {
  isConnecting: boolean;
  isSettingsLoading: boolean;
  daPath: string | null;
  onConnect: () => void;
}

export function ConnectionPanel({
  isConnecting,
  isSettingsLoading,
  daPath,
  onConnect,
}: ConnectionPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-[var(--text)]">Connect to Device</h2>
        <p className="text-sm text-[var(--text-subtle)]">
          Select DA file and connect your MediaTek device
        </p>
      </div>
      <button
        onClick={onConnect}
        disabled={!daPath || isConnecting || isSettingsLoading}
        className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] flex items-center justify-center"
      >
        {isConnecting ? <IdleAnimation /> : 'Connect Device'}
      </button>
    </div>
  );
}
