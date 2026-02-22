import type { FastbootDevice, FastbootRebootMode, FastbootSlot } from '../../types';

interface FastbootInfoField {
  label: string;
  value: string;
}

interface FastbootToolsSectionProps {
  devices: FastbootDevice[];
  selectedDeviceId: string;
  isRefreshing: boolean;
  isGetvarRunning: boolean;
  isGetvarSingleRunning: boolean;
  isFlashRunning: boolean;
  isRebootRunning: boolean;
  isSlotRunning: boolean;
  isEraseRunning: boolean;
  flashImagePath: string | null;
  flashPartition: string;
  getvarName: string;
  getvarValue: string | null;
  erasePartition: string;
  deviceInfoFields: FastbootInfoField[];
  hasDeviceInfo: boolean;
  rawDeviceInfoLines: string[];
  hasSlotSupport: boolean;
  currentSlot: string | null;
  slotSupportMessage: string;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  onGetvarAll: () => void;
  onGetvarSingle: () => void;
  onSelectFlashImage: () => void;
  onFlashPartitionChange: (value: string) => void;
  onFlash: () => void;
  onGetvarNameChange: (value: string) => void;
  onErasePartitionChange: (value: string) => void;
  onErase: () => void;
  onSetActiveSlot: (slot: FastbootSlot) => void;
  onReboot: (mode: FastbootRebootMode) => void;
  onRebootFastbootd: () => void;
}

export function FastbootToolsSection({
  devices,
  selectedDeviceId,
  isRefreshing,
  isGetvarRunning,
  isGetvarSingleRunning,
  isFlashRunning,
  isRebootRunning,
  isSlotRunning,
  isEraseRunning,
  flashImagePath,
  flashPartition,
  getvarName,
  getvarValue,
  erasePartition,
  deviceInfoFields,
  hasDeviceInfo,
  rawDeviceInfoLines,
  hasSlotSupport,
  currentSlot,
  slotSupportMessage,
  onSelectDevice,
  onRefresh,
  onGetvarAll,
  onGetvarSingle,
  onSelectFlashImage,
  onFlashPartitionChange,
  onFlash,
  onGetvarNameChange,
  onErasePartitionChange,
  onErase,
  onSetActiveSlot,
  onReboot,
  onRebootFastbootd,
}: FastbootToolsSectionProps) {
  const formatDeviceLabel = (device: FastbootDevice) => {
    const serial = device.serialNumber || 'Unknown serial';
    const product = device.product || 'Fastboot device';
    return `${product} (${serial})`;
  };

  const hasDevices = devices.length > 0;
  const slotActionsDisabled = !hasSlotSupport || !selectedDeviceId || isSlotRunning;
  const rebootDisabled = !selectedDeviceId || isRebootRunning;
  const getvarSingleDisabled = !selectedDeviceId || isGetvarSingleRunning;
  const eraseDisabled = !selectedDeviceId || !erasePartition || isEraseRunning;

  return (
    <section className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Fastboot Tools</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Use these tools only after the device is already in Fastboot mode.
        </p>
      </div>

      {!hasDevices && (
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-muted)]">
          No fastboot devices detected. Put the device in fastboot mode and click refresh.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs uppercase tracking-wide text-[var(--text-subtle)] mb-2">
            Fastboot Device
          </label>
          <select
            value={selectedDeviceId}
            onChange={(event) => onSelectDevice(event.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">Select a device</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {formatDeviceLabel(device)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Devices'}
        </button>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Device Info</h3>
            <p className="text-xs text-[var(--text-muted)]">Parsed from getvar all output.</p>
          </div>
          <button
            onClick={onGetvarAll}
            disabled={!selectedDeviceId || isGetvarRunning}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isGetvarRunning ? 'Fetching variables...' : 'Refresh Info'}
          </button>
        </div>

        {hasDeviceInfo ? (
          <div className="grid gap-3 md:grid-cols-2">
            {deviceInfoFields.map((field) => (
              <div key={field.label} className="rounded border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-xs uppercase tracking-wide text-[var(--text-subtle)]">
                  {field.label}
                </div>
                <div className="mt-1 text-sm text-[var(--text)]">{field.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--text-muted)]">
            Run getvar all to populate device information.
          </div>
        )}

        {rawDeviceInfoLines.length > 0 && (
          <details className="rounded border border-[var(--border)] bg-[var(--surface)] p-3">
            <summary className="cursor-pointer text-sm font-medium text-[var(--text)]">
              Raw getvar output
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto text-xs text-[var(--text-muted)]">
              {rawDeviceInfoLines.join('\n')}
            </pre>
          </details>
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Quick Getvar</h3>
            <p className="text-xs text-[var(--text-muted)]">Query a single fastboot variable.</p>
          </div>
          <button
            onClick={onGetvarSingle}
            disabled={getvarSingleDisabled || !getvarName.trim()}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isGetvarSingleRunning ? 'Fetching variable...' : 'Getvar'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs uppercase tracking-wide text-[var(--text-subtle)] mb-2">
              Variable Name
            </label>
            <input
              value={getvarName}
              onChange={(event) => onGetvarNameChange(event.target.value)}
              placeholder="e.g. current-slot"
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          {getvarValue && (
            <div className="min-w-[220px] rounded border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="text-xs uppercase tracking-wide text-[var(--text-subtle)]">Value</div>
              <div className="mt-1 text-sm text-[var(--text)]">{getvarValue}</div>
            </div>
          )}
        </div>
      </div>


      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs uppercase tracking-wide text-[var(--text-subtle)] mb-2">
              Partition
            </label>
            <input
              value={flashPartition}
              onChange={(event) => onFlashPartitionChange(event.target.value)}
              placeholder="e.g. boot, recovery"
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs uppercase tracking-wide text-[var(--text-subtle)] mb-2">
              Image
            </label>
            <div className="flex gap-2">
              <input
                value={flashImagePath ?? ''}
                readOnly
                placeholder="Select image file"
                className="flex-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none"
              />
              <button
                onClick={onSelectFlashImage}
                className="px-3 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors"
              >
                Browse
              </button>
            </div>
          </div>
          <button
            onClick={onFlash}
            disabled={!selectedDeviceId || !flashPartition || !flashImagePath || isFlashRunning}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isFlashRunning ? 'Flashing...' : 'Flash'}
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Erase Partition</h3>
          <p className="text-xs text-[var(--text-muted)]">
            This will permanently erase the selected partition.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs uppercase tracking-wide text-[var(--text-subtle)] mb-2">
              Partition
            </label>
            <input
              value={erasePartition}
              onChange={(event) => onErasePartitionChange(event.target.value)}
              placeholder="e.g. userdata"
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button
            onClick={onErase}
            disabled={eraseDisabled}
            className="px-4 py-2 bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-[var(--danger-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isEraseRunning ? 'Erasing...' : 'Erase'}
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Slot Management</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {slotSupportMessage}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-[var(--text)]">
            Current slot: <span className="font-semibold">{currentSlot ?? '—'}</span>
          </div>
          <button
            onClick={() => onSetActiveSlot('a')}
            disabled={slotActionsDisabled}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Set Slot A
          </button>
          <button
            onClick={() => onSetActiveSlot('b')}
            disabled={slotActionsDisabled}
            className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
          >
            Set Slot B
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onReboot('normal')}
          disabled={rebootDisabled}
          className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
        >
          Reboot
        </button>
        <button
          onClick={() => onReboot('bootloader')}
          disabled={rebootDisabled}
          className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
        >
          Reboot Bootloader
        </button>
        <button
          onClick={() => onReboot('recovery')}
          disabled={rebootDisabled}
          className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
        >
          Reboot Recovery
        </button>
        <button
          onClick={onRebootFastbootd}
          disabled={rebootDisabled}
          className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          Reboot Fastbootd
        </button>
      </div>
    </section>
  );
}
