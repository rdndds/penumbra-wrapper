import type { FastbootDevice, FastbootRebootMode } from '../../types';

interface FastbootToolsSectionProps {
  devices: FastbootDevice[];
  selectedDeviceId: string;
  isRefreshing: boolean;
  isGetvarRunning: boolean;
  isFlashRunning: boolean;
  isRebootRunning: boolean;
  flashImagePath: string | null;
  flashPartition: string;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  onGetvarAll: () => void;
  onSelectFlashImage: () => void;
  onFlashPartitionChange: (value: string) => void;
  onFlash: () => void;
  onReboot: (mode: FastbootRebootMode) => void;
}

export function FastbootToolsSection({
  devices,
  selectedDeviceId,
  isRefreshing,
  isGetvarRunning,
  isFlashRunning,
  isRebootRunning,
  flashImagePath,
  flashPartition,
  onSelectDevice,
  onRefresh,
  onGetvarAll,
  onSelectFlashImage,
  onFlashPartitionChange,
  onFlash,
  onReboot,
}: FastbootToolsSectionProps) {
  const formatDeviceLabel = (device: FastbootDevice) => {
    const serial = device.serialNumber || 'Unknown serial';
    const product = device.product || 'Fastboot device';
    return `${product} (${serial})`;
  };

  return (
    <section className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Fastboot Tools</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Use these tools only after the device is already in Fastboot mode.
        </p>
      </div>

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

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onGetvarAll}
          disabled={!selectedDeviceId || isGetvarRunning}
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isGetvarRunning ? 'Fetching variables...' : 'Getvar All'}
        </button>
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

      <div className="border-t border-[var(--border)] pt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onReboot('normal')}
          disabled={!selectedDeviceId || isRebootRunning}
          className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
        >
          Reboot
        </button>
        <button
          onClick={() => onReboot('bootloader')}
          disabled={!selectedDeviceId || isRebootRunning}
          className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
        >
          Reboot Bootloader
        </button>
        <button
          onClick={() => onReboot('recovery')}
          disabled={!selectedDeviceId || isRebootRunning}
          className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded text-sm text-[var(--text)] transition-colors disabled:opacity-50"
        >
          Reboot Recovery
        </button>
      </div>
    </section>
  );
}
