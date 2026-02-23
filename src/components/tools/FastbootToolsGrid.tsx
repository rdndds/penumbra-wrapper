import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FastbootDevice, FastbootRebootMode, FastbootSlot } from '../../types';

interface FastbootInfoField {
  label: string;
  value: string;
}

type FastbootRebootTarget = FastbootRebootMode | 'fastbootd';

interface FastbootToolsGridProps {
  devices: FastbootDevice[];
  selectedDeviceId: string;
  isRefreshing: boolean;
  isGetvarRunning: boolean;
  isGetvarSingleRunning: boolean;
  isFlashRunning: boolean;
  isEraseRunning: boolean;
  isRebootRunning: boolean;
  isSlotRunning: boolean;
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
  rebootMode: FastbootRebootTarget;
  slotSelection: FastbootSlot;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  onGetvarAll: () => void;
  onGetvarSingle: () => void;
  onGetvarNameChange: (value: string) => void;
  onSelectFlashImage: () => void;
  onFlashPartitionChange: (value: string) => void;
  onFlash: () => void;
  onErasePartitionChange: (value: string) => void;
  onErase: () => void;
  onRebootSelect: (mode: FastbootRebootTarget) => void;
  onSlotSelectionChange: (slot: FastbootSlot) => void;
  onSetActiveSlot: () => void;
}

const rebootOptions: { value: FastbootRebootTarget; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'bootloader', label: 'Bootloader' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'fastbootd', label: 'Fastbootd' },
];

const slotOptions: { value: FastbootSlot; label: string }[] = [
  { value: 'a', label: 'Slot A' },
  { value: 'b', label: 'Slot B' },
];

export function FastbootToolsGrid({
  devices,
  selectedDeviceId,
  isRefreshing,
  isGetvarRunning,
  isGetvarSingleRunning,
  isFlashRunning,
  isEraseRunning,
  isRebootRunning,
  isSlotRunning,
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
  rebootMode,
  slotSelection,
  onSelectDevice,
  onRefresh,
  onGetvarAll,
  onGetvarSingle,
  onGetvarNameChange,
  onSelectFlashImage,
  onFlashPartitionChange,
  onFlash,
  onErasePartitionChange,
  onErase,
  onRebootSelect,
  onSlotSelectionChange,
  onSetActiveSlot,
}: FastbootToolsGridProps) {
  const hasDevices = devices.length > 0;
  const isDeviceSelected = !!selectedDeviceId;
  const slotActionsDisabled = !hasSlotSupport || !isDeviceSelected || isSlotRunning;
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId);
  const selectedDeviceLabel = selectedDevice
    ? `${selectedDevice.product || 'Fastboot device'} (${selectedDevice.serialNumber || selectedDevice.id})`
    : 'Select device';
  const [rebootOpen, setRebootOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const rebootRef = useRef<HTMLDivElement | null>(null);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const deviceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rebootRef.current && !rebootRef.current.contains(event.target as Node)) {
        setRebootOpen(false);
      }
      if (slotRef.current && !slotRef.current.contains(event.target as Node)) {
        setSlotOpen(false);
      }
      if (deviceRef.current && !deviceRef.current.contains(event.target as Node)) {
        setDeviceOpen(false);
      }
    };

    if (rebootOpen || slotOpen || deviceOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [rebootOpen, slotOpen, deviceOpen]);

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
                  {selectedDeviceLabel}
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
                          {device.product || 'Fastboot device'} ({device.serialNumber || device.id})
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
                  onClick={onGetvarAll}
                  disabled={!isDeviceSelected || isGetvarRunning}
                  className="px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {isGetvarRunning ? 'Fetching...' : 'Getvar All'}
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
                  disabled={!isDeviceSelected || isRebootRunning}
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
            No fastboot devices detected.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 md:col-span-2 xl:col-span-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Summary</p>
          <h3 className="text-base font-semibold text-[var(--text)]">Device Info</h3>
        </div>
        {hasDeviceInfo ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {deviceInfoFields.map((field) => (
              <div key={field.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-3">
                <div className="text-xs uppercase tracking-wide text-[var(--text-subtle)]">
                  {field.label}
                </div>
                <div className="mt-1 text-sm text-[var(--text)]">{field.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Run Getvar All to populate info.</p>
        )}
        {rawDeviceInfoLines.length > 0 && (
          <details className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-3">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
              Raw getvar output
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto text-xs text-[var(--text-muted)]">
              {rawDeviceInfoLines.join('\n')}
            </pre>
          </details>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 md:col-span-2 xl:col-span-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Getvar</p>
          <h3 className="text-base font-semibold text-[var(--text)]">Quick Query</h3>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
          <input
            value={getvarName}
            onChange={(event) => onGetvarNameChange(event.target.value)}
            placeholder="current-slot"
            className="flex-1 min-w-0 px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onGetvarSingle}
            disabled={!isDeviceSelected || !getvarName.trim() || isGetvarSingleRunning}
            className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 shrink-0"
          >
            {isGetvarSingleRunning ? 'Fetching...' : 'Getvar'}
          </button>
        </div>
        {getvarValue && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] p-3 text-sm text-[var(--text)]">
            {getvarValue}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 md:col-span-2 xl:col-span-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Flash</p>
          <h3 className="text-base font-semibold text-[var(--text)]">Image Operations</h3>
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
          <button
            onClick={onSelectFlashImage}
            disabled={isFlashRunning}
            className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            {flashImagePath ? 'Change Image' : 'Select Image'}
          </button>
          <span className="text-xs text-[var(--text-muted)] truncate min-w-0 flex-1">
            {flashImagePath || 'No image selected'}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={flashPartition}
            onChange={(event) => onFlashPartitionChange(event.target.value)}
            placeholder="boot"
            className="flex-1 px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onFlash}
            disabled={!isDeviceSelected || !flashPartition || !flashImagePath || isFlashRunning}
            className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isFlashRunning ? 'Flashing...' : 'Flash'}
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={erasePartition}
            onChange={(event) => onErasePartitionChange(event.target.value)}
            placeholder="userdata"
            className="flex-1 px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={onErase}
            disabled={!isDeviceSelected || !erasePartition || isEraseRunning}
            className="px-3 py-2 rounded-lg bg-[var(--danger)] text-[var(--danger-foreground)] text-sm font-semibold hover:bg-[var(--danger-hover)] disabled:opacity-50"
          >
            {isEraseRunning ? 'Erasing...' : 'Erase'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 md:col-span-2 xl:col-span-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Slots</p>
          <h3 className="text-base font-semibold text-[var(--text)]">Slot Management</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Current slot: {currentSlot ?? '—'}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1" ref={slotRef}>
            <button
              type="button"
              onClick={() => setSlotOpen((open) => !open)}
              disabled={slotActionsDisabled}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-alt)] border border-[var(--border)] text-sm text-[var(--text)] flex items-center justify-between disabled:opacity-50"
            >
              {slotOptions.find((option) => option.value === slotSelection)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {slotOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-50">
                {slotOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSlotOpen(false);
                      onSlotSelectionChange(option.value);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onSetActiveSlot}
            disabled={slotActionsDisabled}
            className="px-3 py-2 rounded-lg bg-[var(--surface-alt)] border border-[var(--border)] text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            Apply
          </button>
        </div>
        {!hasSlotSupport && (
          <p className="text-xs text-[var(--text-muted)]">Slots are not supported on this device.</p>
        )}
      </div>

    </section>
  );
}
