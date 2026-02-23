import type { AdbListEntry, AdbStatResult, AdbUsbDevice, AdbRebootMode } from '../../types';
import { ProgressBar } from '../ProgressBar';

interface AdbToolsSectionProps {
  devices: AdbUsbDevice[];
  selectedDeviceId: string;
  isRefreshing: boolean;
  isShellCommandRunning: boolean;
  isFileOperationRunning: boolean;
  isPackageRunning: boolean;
  isSystemActionRunning: boolean;
  isScreenshotRunning: boolean;
  isAuthCheckRunning: boolean;
  shellCommand: string;
  listPath: string;
  statPath: string;
  pushLocalPath: string | null;
  pushRemotePath: string;
  pullRemotePath: string;
  pullLocalPath: string | null;
  installApkPath: string | null;
  uninstallPackage: string;
  listResults: AdbListEntry[];
  statResult: AdbStatResult | null;
  transferProgress: number | null;
  transferStatus: string | null;
  onRefresh: () => void;
  onAuthCheck: () => void;
  onSelectDevice: (deviceId: string) => void;
  onShellCommandChange: (value: string) => void;
  onRunShellCommand: () => void;
  onListPathChange: (value: string) => void;
  onStatPathChange: (value: string) => void;
  onList: () => void;
  onStat: () => void;
  onSelectPushLocal: () => void;
  onPushRemoteChange: (value: string) => void;
  onPush: () => void;
  onSelectPullLocal: () => void;
  onPullRemoteChange: (value: string) => void;
  onPull: () => void;
  onSelectInstallApk: () => void;
  onInstall: () => void;
  onUninstallPackageChange: (value: string) => void;
  onUninstall: () => void;
  onSystemAction: (action: string) => void;
  onReboot: (mode: AdbRebootMode) => void;
  onScreenshot: () => void;
}

export function AdbToolsSection({
  devices,
  selectedDeviceId,
  isRefreshing,
  isShellCommandRunning,
  isFileOperationRunning,
  isPackageRunning,
  isSystemActionRunning,
  isScreenshotRunning,
  isAuthCheckRunning,
  shellCommand,
  listPath,
  statPath,
  pushLocalPath,
  pushRemotePath,
  pullRemotePath,
  pullLocalPath,
  installApkPath,
  uninstallPackage,
  listResults,
  statResult,
  transferProgress,
  transferStatus,
  onRefresh,
  onAuthCheck,
  onSelectDevice,
  onShellCommandChange,
  onRunShellCommand,
  onListPathChange,
  onStatPathChange,
  onList,
  onStat,
  onSelectPushLocal,
  onPushRemoteChange,
  onPush,
  onSelectPullLocal,
  onPullRemoteChange,
  onPull,
  onSelectInstallApk,
  onInstall,
  onUninstallPackageChange,
  onUninstall,
  onSystemAction,
  onReboot,
  onScreenshot,
}: AdbToolsSectionProps) {
  const hasDevices = devices.length > 0;
  const isDeviceSelected = !!selectedDeviceId;

  return (
    <section className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">ADB Tools (USB)</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          USB-only ADB actions with logs, progress, and toasts.
        </p>
      </div>

      {!hasDevices && (
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-muted)]">
          No USB ADB devices detected. Ensure the device is connected and authorized.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs uppercase tracking-wide text-[var(--text-subtle)] mb-2">
            USB Device
          </label>
          <select
            value={selectedDeviceId}
            onChange={(event) => onSelectDevice(event.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">Select device</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.description} ({device.vendorId.toString(16)}:{device.productId.toString(16)})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <button
          onClick={onAuthCheck}
          disabled={!isDeviceSelected || isAuthCheckRunning}
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isAuthCheckRunning ? 'Checking...' : 'Check Authorization'}
        </button>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text)]">Shell Command</h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={shellCommand}
            onChange={(event) => onShellCommandChange(event.target.value)}
            placeholder="getprop ro.build.version.release"
            className="flex-1 min-w-[260px] px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onRunShellCommand}
            disabled={!isDeviceSelected || !shellCommand.trim() || isShellCommandRunning}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isShellCommandRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">File Tools</h3>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={listPath}
            onChange={(event) => onListPathChange(event.target.value)}
            placeholder="/sdcard"
            className="flex-1 min-w-[240px] px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onList}
            disabled={!isDeviceSelected || !listPath.trim() || isFileOperationRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            List
          </button>
        </div>

        {listResults.length > 0 && (
          <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-[var(--text-subtle)] mb-2">Results</div>
            <div className="grid gap-1">
              {listResults.map((item) => (
                <div key={`${item.entry_type}-${item.name}`} className="flex justify-between">
                  <span className="text-[var(--text)]">{item.name}</span>
                  <span className="text-[var(--text-muted)]">{item.entry_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={statPath}
            onChange={(event) => onStatPathChange(event.target.value)}
            placeholder="/sdcard/file.txt"
            className="flex-1 min-w-[240px] px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onStat}
            disabled={!isDeviceSelected || !statPath.trim() || isFileOperationRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Stat
          </button>
        </div>

        {statResult && (
          <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-[var(--text-subtle)] mb-2">Stat</div>
            <div className="grid gap-1 text-[var(--text)]">
              <div>Size: {statResult.file_size}</div>
              <div>Permissions: {statResult.file_perm}</div>
              <div>Modified: {statResult.mod_time}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onSelectPushLocal}
            disabled={isFileOperationRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            {pushLocalPath ? 'Change Local File' : 'Select Local File'}
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {pushLocalPath || 'No file selected'}
          </span>
          <input
            value={pushRemotePath}
            onChange={(event) => onPushRemoteChange(event.target.value)}
            placeholder="/sdcard/upload.bin"
            className="flex-1 min-w-[220px] px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onPush}
            disabled={!isDeviceSelected || !pushLocalPath || !pushRemotePath.trim() || isFileOperationRunning}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Push
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={pullRemotePath}
            onChange={(event) => onPullRemoteChange(event.target.value)}
            placeholder="/sdcard/download.bin"
            className="flex-1 min-w-[220px] px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onSelectPullLocal}
            disabled={isFileOperationRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            {pullLocalPath ? 'Change Save Path' : 'Select Save Path'}
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {pullLocalPath || 'No save path selected'}
          </span>
          <button
            onClick={onPull}
            disabled={!isDeviceSelected || !pullRemotePath.trim() || !pullLocalPath || isFileOperationRunning}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Pull
          </button>
        </div>

        {transferProgress !== null && (
          <ProgressBar
            progress={transferProgress}
            status={transferStatus || undefined}
            className="mt-2"
          />
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text)]">Package Tools</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onSelectInstallApk}
            disabled={isPackageRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            {installApkPath ? 'Change APK' : 'Select APK'}
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {installApkPath || 'No APK selected'}
          </span>
          <button
            onClick={onInstall}
            disabled={!isDeviceSelected || !installApkPath || isPackageRunning}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Install
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={uninstallPackage}
            onChange={(event) => onUninstallPackageChange(event.target.value)}
            placeholder="com.example.app"
            className="flex-1 min-w-[260px] px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onUninstall}
            disabled={!isDeviceSelected || !uninstallPackage.trim() || isPackageRunning}
            className="px-4 py-2 bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-[var(--danger-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Uninstall
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text)]">System Actions</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onSystemAction('root')}
            disabled={!isDeviceSelected || isSystemActionRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Root
          </button>
          <button
            onClick={() => onSystemAction('remount')}
            disabled={!isDeviceSelected || isSystemActionRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Remount
          </button>
          <button
            onClick={() => onSystemAction('enable-verity')}
            disabled={!isDeviceSelected || isSystemActionRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Enable Verity
          </button>
          <button
            onClick={() => onSystemAction('disable-verity')}
            disabled={!isDeviceSelected || isSystemActionRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Disable Verity
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onReboot('normal')}
            disabled={!isDeviceSelected || isSystemActionRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Reboot
          </button>
          <button
            onClick={() => onReboot('bootloader')}
            disabled={!isDeviceSelected || isSystemActionRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Reboot Bootloader
          </button>
          <button
            onClick={() => onReboot('recovery')}
            disabled={!isDeviceSelected || isSystemActionRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Reboot Recovery
          </button>
          <button
            onClick={() => onReboot('fastboot')}
            disabled={!isDeviceSelected || isSystemActionRunning}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Reboot Fastboot
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onScreenshot}
          disabled={!isDeviceSelected || isScreenshotRunning}
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isScreenshotRunning ? 'Saving...' : 'Save Screenshot'}
        </button>
        <span className="text-xs text-[var(--text-muted)]">
          Saved to Antumbra output directory.
        </span>
      </div>
    </section>
  );
}
