import { FileDown, Usb } from 'lucide-react';

interface FlasherHeaderProps {
  daPath: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  isSettingsLoading: boolean;
  isLoadingScatter: boolean;
  onConnect: () => void;
  onSelectScatter: () => void;
}

export function FlasherHeader({
  daPath,
  isConnecting,
  isConnected,
  isSettingsLoading,
  isLoadingScatter,
  onConnect,
  onSelectScatter,
}: FlasherHeaderProps) {
  return (
    <header className="border-b border-zinc-800 p-4 bg-zinc-900/95 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onConnect}
          disabled={isConnecting || !daPath || isConnected || isSettingsLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={!daPath ? 'Select DA file in Dashboard first' : isConnected ? 'Already connected' : 'Connect to device'}
        >
          <Usb className="w-5 h-5" />
          {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect Device'}
        </button>
        <button
          onClick={onSelectScatter}
          disabled={isLoadingScatter}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="w-5 h-5" />
          {isLoadingScatter ? 'Loading...' : 'Load Scatter File'}
        </button>
      </div>
    </header>
  );
}
