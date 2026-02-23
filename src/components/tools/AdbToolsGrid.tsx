import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AdbListEntry, AdbRebootMode, AdbUsbDevice } from '../../types';
import { ProgressBar } from '../ProgressBar';

interface AdbToolsGridProps {
  devices: AdbUsbDevice[];
  selectedDeviceId: string;
  isRefreshing: boolean;
  isAuthCheckRunning: boolean;
  isFileOperationRunning: boolean;
  isPackageRunning: boolean;
  isSystemActionRunning: boolean;
  isScreenshotRunning: boolean;
  listPath: string;
  pushLocalPath: string | null;
  pushRemotePath: string;
  pullRemotePath: string;
  pullLocalPath: string | null;
  installApkPath: string | null;
  uninstallPackage: string;
  listResults: AdbListEntry[];
  transferProgress: number | null;
  transferStatus: string | null;
  rebootMode: AdbRebootMode;
  onRefresh: () => void;
  onAuthCheck: () => void;
  onSelectDevice: (deviceId: string) => void;
  onListPathChange: (value: string) => void;
  onList: () => void;
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
  onRebootSelect: (mode: AdbRebootMode) => void;
  onScreenshot: () => void;
}

const rebootOptions: { value: AdbRebootMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'bootloader', label: 'Bootloader' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'fastboot', label: 'Fastboot' },
];

export function AdbToolsGrid({
  devices,
  selectedDeviceId,
  isRefreshing,
  isAuthCheckRunning,
  isFileOperationRunning,
  isPackageRunning,
  isSystemActionRunning,
  isScreenshotRunning,
  listPath,
  pushLocalPath,
  pushRemotePath,
  pullRemotePath,
  pullLocalPath,
  installApkPath,
  uninstallPackage,
  listResults,
  transferProgress,
  transferStatus,
  rebootMode,
  onRefresh,
  onAuthCheck,
  onSelectDevice,
  onListPathChange,
  onList,
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
  onRebootSelect,
  onScreenshot,
}: AdbToolsGridProps) {
  const hasDevices = devices.length > 0;
  const isDeviceSelected = !!selectedDeviceId;
  const [rebootOpen, setRebootOpen] = useState(false);
  const rebootRef = useRef<HTMLDivElement | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const deviceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rebootRef.current && !rebootRef.current.contains(event.target as Node)) {
        setRebootOpen(false);
      }
      if (deviceRef.current && !deviceRef.current.contains(event.target as Node)) {
        setDeviceOpen(false);
      }
    };

    if (rebootOpen || deviceOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [rebootOpen, deviceOpen]);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4 md:col-span-2 xl:col-span-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:flex-1 xl:justify-between">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:min-w-[22rem]" ref={deviceRef}>
              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setDeviceOpen((open) => !open)}
                  className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)] flex items-center justify-between"
                >
                  {selectedDeviceId
                    ? devices.find((device) => device.id === selectedDeviceId)?.description ||
                      'Selected device'
                    : 'Select device'}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {deviceOpen && (
                  <div className="absolute z-50 mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
                    {devices.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-[var(--text-muted)]">No devices</div>
                    ) : (
                      devices.map((device) => (
                        <button
                          key={device.id}
                          onClick={() => {
                            setDeviceOpen(false);
                            onSelectDevice(device.id);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          {device.description} ({device.vendorId.toString(16)}:{device.productId.toString(16)})
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={onAuthCheck}
                  disabled={!isDeviceSelected || isAuthCheckRunning}
                  className="px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {isAuthCheckRunning ? 'Checking...' : 'Check Authorization'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-1 text-xs text-[var(--text-muted)]">
                <span className={`h-2 w-2 rounded-full ${hasDevices ? 'bg-emerald-400' : 'bg-[var(--border)]'}`} />
                {hasDevices ? (isDeviceSelected ? 'Device selected' : 'Select a device') : 'No device'}
              </div>
              <div className="relative" ref={rebootRef}>
                <button
                  type="button"
                  onClick={() => setRebootOpen((open) => !open)}
                  disabled={!isDeviceSelected || isSystemActionRunning}
                  className="px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50 flex items-center justify-between min-w-[8rem]"
                >
                  Reboot
                  <ChevronDown className="w-4 h-4" />
                </button>
                {rebootOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-50">
                    {rebootOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setRebootOpen(false);
                          onRebootSelect(option.value);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors ${
                          option.value === rebootMode ? 'bg-[var(--surface-hover)] font-semibold' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {!hasDevices && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-xs text-[var(--text-muted)]">
            No USB ADB devices detected.
          </div>
        )}
        <p className="text-xs text-[var(--text-muted)]">Unlock the device if storage access fails.</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 md:col-span-2 xl:col-span-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">File Ops</p>
          <h3 className="text-base font-semibold text-[var(--text)]">List</h3>
        </div>
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
            <input
              value={listPath}
              onChange={(event) => onListPathChange(event.target.value)}
              placeholder="/sdcard"
              className="flex-1 px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={onList}
              disabled={!isDeviceSelected || !listPath.trim() || isFileOperationRunning}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              List
            </button>
          </div>
        </div>
        {listResults.length > 0 ? (
          <div className="max-h-32 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-3 text-xs text-[var(--text-muted)]">
            {listResults.map((entry) => (
              <div key={`${entry.entry_type}-${entry.name}`} className="flex justify-between">
                <span className="text-[var(--text)]">{entry.name}</span>
                <span>{entry.entry_type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">No entries loaded yet.</p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4 md:col-span-2 xl:col-span-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Snapshot</p>
          <h3 className="text-base font-semibold text-[var(--text)]">Framebuffer Capture</h3>
        </div>
        <button
          onClick={onScreenshot}
          disabled={!isDeviceSelected || isScreenshotRunning}
          className="w-full px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {isScreenshotRunning ? 'Saving...' : 'Save Screenshot'}
        </button>
        <p className="text-xs text-[var(--text-muted)]">Saved to Antumbra output directory.</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 md:col-span-2 xl:col-span-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Transfers</p>
          <h3 className="text-base font-semibold text-[var(--text)]">Push & Pull</h3>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 min-w-0">
            <button
              onClick={onSelectPushLocal}
              disabled={isFileOperationRunning}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {pushLocalPath ? 'Change Local File' : 'Select Local File'}
            </button>
            <span className="text-xs text-[var(--text-muted)] truncate max-w-full">
              {pushLocalPath || 'No file selected'}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
            <input
              value={pushRemotePath}
              onChange={(event) => onPushRemoteChange(event.target.value)}
              placeholder="/sdcard"
              className="flex-1 px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={onPush}
              disabled={!isDeviceSelected || !pushLocalPath || !pushRemotePath.trim() || isFileOperationRunning}
              className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              Push
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Remote path is treated as a directory. The local filename will be appended.
        </p>
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
            <input
              value={pullRemotePath}
              onChange={(event) => onPullRemoteChange(event.target.value)}
              placeholder="/sdcard/download.bin"
              className="flex-1 px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={onSelectPullLocal}
              disabled={isFileOperationRunning}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {pullLocalPath ? 'Change Save Path' : 'Save Path'}
            </button>
            <button
              onClick={onPull}
              disabled={!isDeviceSelected || !pullRemotePath.trim() || !pullLocalPath || isFileOperationRunning}
              className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              Pull
            </button>
          </div>
          <span className="text-xs text-[var(--text-muted)] truncate max-w-full">
            {pullLocalPath || 'No save path selected'}
          </span>
        </div>
        {transferProgress !== null && (
          <ProgressBar progress={transferProgress} status={transferStatus || undefined} className="mt-1" />
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 md:col-span-2 xl:col-span-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Packages</p>
          <h3 className="text-base font-semibold text-[var(--text)]">Install / Uninstall</h3>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
          <button
            onClick={onSelectInstallApk}
            disabled={isPackageRunning}
            className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            {installApkPath ? 'Change APK' : 'Select APK'}
          </button>
          <span className="text-xs text-[var(--text-muted)] truncate min-w-0 flex-1">
            {installApkPath || 'No APK selected'}
          </span>
          <button
            onClick={onInstall}
            disabled={!isDeviceSelected || !installApkPath || isPackageRunning}
            className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            Install
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={uninstallPackage}
            onChange={(event) => onUninstallPackageChange(event.target.value)}
            placeholder="com.example.app"
            className="flex-1 px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onUninstall}
            disabled={!isDeviceSelected || !uninstallPackage.trim() || isPackageRunning}
            className="px-3 py-2 rounded-lg bg-[var(--danger)] text-[var(--danger-foreground)] text-sm font-semibold hover:bg-[var(--danger-hover)] disabled:opacity-50"
          >
            Uninstall
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4 md:col-span-2 xl:col-span-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">System</p>
          <h3 className="text-base font-semibold text-[var(--text)]">System Actions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'root', label: 'Root' },
            { key: 'remount', label: 'Remount' },
            { key: 'enable-verity', label: 'Enable Verity' },
            { key: 'disable-verity', label: 'Disable Verity' },
          ].map((action) => (
            <button
              key={action.key}
              onClick={() => onSystemAction(action.key)}
              disabled={!isDeviceSelected || isSystemActionRunning}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
