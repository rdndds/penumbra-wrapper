import { useState } from 'react';
import { AlertCircle, CheckCircle, Info, Terminal } from 'lucide-react';
import { useDeviceStore } from '../store/deviceStore';
import type { WindowsDiagnostics } from '../types';
import { DiagnosticsApi } from '../services/api/diagnosticsApi';

export function WindowsDiagnosticsPanel() {
  const { isConnected, isConnecting } = useDeviceStore();
  const [diagnostics, setDiagnostics] = useState<WindowsDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    if (isConnected || isConnecting) {
      setError('Cannot run diagnostics while connected to device. Disconnect first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await DiagnosticsApi.checkWindowsEnvironment();
      setDiagnostics(result);
    } catch (err) {
      // Use the error parser to extract message from any error format
      const { parseTauriError } = await import('../services/utils/errorParser');
      const parsedError = parseTauriError(err);
      setError(parsedError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearDiagnostics = () => {
    setDiagnostics(null);
    setError(null);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="w-4 h-4 text-[var(--success)]" /> : 
      <AlertCircle className="w-4 h-4 text-[var(--danger)]" />;
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-[var(--success)]' : 'text-[var(--danger)]';
  };

  return (
    <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[var(--text-muted)]" />
            <h3 className="text-lg font-medium text-[var(--text)]">Windows Environment Diagnostics</h3>
        </div>
        <div className="flex gap-2">
          {!diagnostics && !isLoading && (
            <button
              onClick={runDiagnostics}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-md transition-colors"
            >
              Run Diagnostics
            </button>
          )}
          {diagnostics && (
            <button
              onClick={clearDiagnostics}
              className="px-4 py-2 bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] text-[var(--text)] rounded-md transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-4 text-zinc-400">Running diagnostics...</p>
        </div>
      )}

      {error && (
          <div className="mb-4 p-4 bg-[var(--danger-soft)] border border-[var(--danger)] rounded-md">
            <div className="flex items-center gap-2 text-[var(--danger)]">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Diagnostics Error</span>
            </div>
            <p className="mt-2 text-[var(--text)]">{error}</p>
          </div>
      )}

      {diagnostics && !isLoading && (
        <div className="space-y-6">
          {/* System Information */}
          <div>
            <h4 className="text-md font-medium text-[var(--text)] mb-3">System Information</h4>
            <div className="bg-[var(--surface-alt)] rounded-md p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">Operating System:</span>
                  <p className="text-[var(--text)] font-medium mt-1">{diagnostics.os_info}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Network Connectivity:</span>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(diagnostics.network_connectivity)}
                    <span className={`font-medium ${getStatusColor(diagnostics.network_connectivity)}`}>
                      {diagnostics.network_connectivity ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Binary Information */}
          <div>
            <h4 className="text-md font-medium text-[var(--text)] mb-3">Antumbra Binary</h4>
            <div className="bg-[var(--surface-alt)] rounded-md p-4">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">Location:</span>
                  <p className="text-[var(--text)] font-mono mt-1 break-all">
                    {diagnostics.binary_location || 'Not found'}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Version:</span>
                  <p className="text-[var(--text)] font-medium mt-1">
                    {diagnostics.binary_version || 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Running Processes:</span>
                  <div className="mt-1">
                    {diagnostics.running_antumbra_processes.length > 0 ? (
                      <div className="space-y-1">
                        {diagnostics.running_antumbra_processes.map((process, index) => (
                          <div key={index} className="text-[var(--warning)] font-mono text-xs">
                            PID: {process}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[var(--success)]">None detected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Information */}
          <div>
            <h4 className="text-md font-medium text-[var(--text)] mb-3">Configuration</h4>
            <div className="bg-[var(--surface-alt)] rounded-md p-4">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">Config File:</span>
                  <p className="text-[var(--text)] font-mono mt-1 break-all">
                    {diagnostics.config_location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">Config Exists:</span>
                  {getStatusIcon(diagnostics.config_exists)}
                  <span className={`font-medium ${getStatusColor(diagnostics.config_exists)}`}>
                    {diagnostics.config_exists ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">Write Permissions:</span>
                  {getStatusIcon(diagnostics.permissions_ok)}
                  <span className={`font-medium ${getStatusColor(diagnostics.permissions_ok)}`}>
                    {diagnostics.permissions_ok ? 'OK' : 'Issues detected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {diagnostics.recommendations.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-[var(--text)] mb-3">Recommendations</h4>
              <div className="bg-[var(--warning-soft)] border border-[var(--warning)] rounded-md p-4">
                <div className="space-y-2">
                  {diagnostics.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-[var(--warning)] mt-0.5 flex-shrink-0" />
                      <span className="text-[var(--text)] text-sm">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
