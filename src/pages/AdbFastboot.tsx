import { useEffect, useMemo, useRef, useState } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';
import { useDeviceStore } from '../store/deviceStore';
import { useOperationStore } from '../store/operationStore';
import { useUIStore } from '../store/uiStore';
import { useConfirmation } from '../hooks/useConfirmation';
import { useFileSelection } from '../hooks/useFileSelection';
import { DialogType } from '../services/dialogs/fileDialogService';
import { FastbootToolsApi } from '../services/api/fastbootToolsApi';
import { AdbApi } from '../services/api/adbApi';
import { executeOperation } from '../services/operations/executeOperation';
import { DeviceTabs } from '../components/tools/DeviceTabs';
import { AdbToolsGrid } from '../components/tools/AdbToolsGrid';
import { FastbootToolsGrid } from '../components/tools/FastbootToolsGrid';
import type {
  AdbListEntry,
  AdbRebootMode,
  AdbUsbDevice,
  FastbootDevice,
  FastbootRebootMode,
  FastbootSlot,
  FastbootStatusEvent,
} from '../types';

interface FastbootVarEntry {
  key: string;
  value: string;
}

const parseFastbootVarLines = (lines: string[]) => {
  const entries: FastbootVarEntry[] = [];
  const rawLines: string[] = [];
  const map: Record<string, string> = {};

  lines.forEach((line) => {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      rawLines.push(line);
      return;
    }
    const key = match[1].trim();
    const value = match[2].trim();
    entries.push({ key, value });
    map[key] = value;
  });

  return { entries, rawLines, map };
};

const getFileName = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const name = parts.pop();
  if (!name || !name.trim()) {
    return null;
  }
  return name;
};

export function AdbFastboot() {
  const { defaultOutputPath } = useDeviceStore();
  const { progress } = useOperationStore();
  const openLogPanel = useUIStore((state) => state.openLogPanel);
  const { confirm } = useConfirmation();
  const { selectFile, saveFile } = useFileSelection();

  const [activeTab, setActiveTab] = useState<'adb' | 'fastboot'>('adb');
  const [activeOperations, setActiveOperations] = useState(0);

  const [fastbootDevices, setFastbootDevices] = useState<FastbootDevice[]>([]);
  const [selectedFastbootDeviceId, setSelectedFastbootDeviceId] = useState('');
  const [isFastbootRefreshing, setIsFastbootRefreshing] = useState(false);
  const [isFastbootGetvarRunning, setIsFastbootGetvarRunning] = useState(false);
  const [isFastbootGetvarSingleRunning, setIsFastbootGetvarSingleRunning] = useState(false);
  const [isFastbootFlashRunning, setIsFastbootFlashRunning] = useState(false);
  const [isFastbootEraseRunning, setIsFastbootEraseRunning] = useState(false);
  const [isFastbootRebootRunning, setIsFastbootRebootRunning] = useState(false);
  const [isFastbootSlotRunning, setIsFastbootSlotRunning] = useState(false);
  const [fastbootPartition, setFastbootPartition] = useState('');
  const [fastbootImagePath, setFastbootImagePath] = useState<string | null>(null);
  const [fastbootGetvarName, setFastbootGetvarName] = useState('');
  const [fastbootGetvarValue, setFastbootGetvarValue] = useState<string | null>(null);
  const [fastbootErasePartition, setFastbootErasePartition] = useState('');
  const [fastbootVarEntries, setFastbootVarEntries] = useState<FastbootVarEntry[]>([]);
  const [fastbootVarRawLines, setFastbootVarRawLines] = useState<string[]>([]);
  const [fastbootVarMap, setFastbootVarMap] = useState<Record<string, string>>({});
  const [fastbootRebootMode, setFastbootRebootMode] = useState<
    FastbootRebootMode | 'fastbootd'
  >('normal');
  const [fastbootSlotSelection, setFastbootSlotSelection] = useState<FastbootSlot>('a');
  const fastbootToastId = useRef<string | undefined>(undefined);

  const [adbDevices, setAdbDevices] = useState<AdbUsbDevice[]>([]);
  const [selectedAdbDeviceId, setSelectedAdbDeviceId] = useState('');
  const [isAdbRefreshing, setIsAdbRefreshing] = useState(false);
  const [isAdbAuthCheckRunning, setIsAdbAuthCheckRunning] = useState(false);
  const [isAdbFileRunning, setIsAdbFileRunning] = useState(false);
  const [isAdbPackageRunning, setIsAdbPackageRunning] = useState(false);
  const [isAdbSystemRunning, setIsAdbSystemRunning] = useState(false);
  const [isAdbScreenshotRunning, setIsAdbScreenshotRunning] = useState(false);
  const [adbListPath, setAdbListPath] = useState('/sdcard');
  const [adbListResults, setAdbListResults] = useState<AdbListEntry[]>([]);
  const [adbPushLocalPath, setAdbPushLocalPath] = useState<string | null>(null);
  const [adbPushRemotePath, setAdbPushRemotePath] = useState('');
  const [adbPullRemotePath, setAdbPullRemotePath] = useState('');
  const [adbPullLocalPath, setAdbPullLocalPath] = useState<string | null>(null);
  const [adbInstallApkPath, setAdbInstallApkPath] = useState<string | null>(null);
  const [adbUninstallPackage, setAdbUninstallPackage] = useState('');
  const [adbTransferStatus, setAdbTransferStatus] = useState<string | null>(null);
  const [adbRebootMode, setAdbRebootMode] = useState<AdbRebootMode>('normal');

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let isMounted = true;

    const setupListener = async () => {
      unlisten = await listen<FastbootStatusEvent>('fastboot:status', (event) => {
        if (!isMounted) return;
        const { status, message } = event.payload;

        if (status === 'start') {
          fastbootToastId.current = toast.loading(message);
          return;
        }

        const toastId = fastbootToastId.current;
        if (toastId) {
          toast.dismiss(toastId);
          fastbootToastId.current = undefined;
        }

        if (status === 'success') {
          toast.success(message);
        } else if (status === 'no_device') {
          toast.error(message);
        } else if (status === 'open_error') {
          toast.error(message);
        } else if (status === 'no_ack') {
          toast.error(message);
        } else if (status === 'error') {
          toast.error(message);
        }
      });
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      setIsFastbootRefreshing(true);
      try {
        const devices = await FastbootToolsApi.listDevices();
        setFastbootDevices(devices);
        setSelectedFastbootDeviceId((current) => {
          if (devices.some((device) => device.id === current)) {
            return current;
          }
          return devices[0]?.id ?? '';
        });
      } catch {
        toast.error('Failed to list fastboot devices');
      } finally {
        setIsFastbootRefreshing(false);
      }
    };

    loadDevices();
  }, []);

  useEffect(() => {
    const loadAdbDevices = async () => {
      setIsAdbRefreshing(true);
      try {
        const devices = await AdbApi.listDevices();
        setAdbDevices(devices);
        setSelectedAdbDeviceId((current) => {
          if (devices.some((device) => device.id === current)) {
            return current;
          }
          return devices[0]?.id ?? '';
        });
      } catch {
        toast.error('Failed to list ADB devices');
      } finally {
        setIsAdbRefreshing(false);
      }
    };

    loadAdbDevices();
  }, []);

  useEffect(() => {
    setFastbootVarEntries([]);
    setFastbootVarRawLines([]);
    setFastbootVarMap({});
    setFastbootGetvarValue(null);
  }, [selectedFastbootDeviceId]);

  useEffect(() => {
    setAdbListResults([]);
  }, [selectedAdbDeviceId]);

  const runOperation = async (
    options: Parameters<typeof executeOperation>[0],
    {
      longRunning = false,
      openOnOutput = false,
    }: { longRunning?: boolean; openOnOutput?: boolean } = {}
  ) => {
    const shouldOpen = longRunning || activeOperations > 0;
    const shouldClear = longRunning && activeOperations === 0;
    const beforeLogs = useOperationStore.getState().logs.length;
    setActiveOperations((current) => current + 1);
    const result = await executeOperation({
      ...options,
      openLogPanel: shouldOpen,
      clearLogs: shouldClear,
    });
    setActiveOperations((current) => Math.max(0, current - 1));

    if (!result.success) {
      openLogPanel();
    }

    if (openOnOutput) {
      const afterLogs = useOperationStore.getState().logs.length;
      if (afterLogs > beforeLogs) {
        openLogPanel();
      }
    }

    return result;
  };

  const ensureFastbootDevice = () => {
    if (!selectedFastbootDeviceId) {
      toast.error('Select a fastboot device first');
      return false;
    }
    return true;
  };

  const ensureAdbDevice = () => {
    if (!selectedAdbDeviceId) {
      toast.error('Select an ADB device first');
      return false;
    }
    return true;
  };

  const handleRefreshFastbootDevices = async () => {
    if (isFastbootRefreshing) return;
    setIsFastbootRefreshing(true);
    try {
      const devices = await FastbootToolsApi.listDevices();
        setFastbootDevices(devices);
        setSelectedFastbootDeviceId((current) => {
          if (devices.some((device) => device.id === current)) {
            return current;
          }
          return devices[0]?.id ?? '';
        });
    } catch {
      toast.error('Failed to list fastboot devices');
    } finally {
      setIsFastbootRefreshing(false);
    }
  };


  const handleGetvarAll = async () => {
    if (!ensureFastbootDevice()) return;
    if (isFastbootGetvarRunning) return;

    setIsFastbootGetvarRunning(true);
    try {
      await runOperation({
        operation: 'Fastboot getvar all',
        type: 'read',
        partitionName: 'fastboot',
        partitionSize: 'vars',
        successMessage: 'Fastboot variables fetched',
        run: (operationId) =>
          FastbootToolsApi.getvarAll(selectedFastbootDeviceId, operationId).then((lines) => {
            const { entries, rawLines, map } = parseFastbootVarLines(lines);
            setFastbootVarEntries(entries);
            setFastbootVarRawLines(rawLines);
            setFastbootVarMap(map);
          }),
      });
    } finally {
      setIsFastbootGetvarRunning(false);
    }
  };

  const handleGetvarSingle = async () => {
    if (!ensureFastbootDevice()) return;
    const trimmed = fastbootGetvarName.trim();
    if (!trimmed) {
      toast.error('Enter a variable name first');
      return;
    }
    if (isFastbootGetvarSingleRunning) return;

    setIsFastbootGetvarSingleRunning(true);
    try {
      await runOperation({
        operation: `Fastboot getvar ${trimmed}`,
        type: 'read',
        partitionName: 'fastboot',
        partitionSize: trimmed,
        successMessage: 'Fastboot variable fetched',
        run: (operationId) =>
          FastbootToolsApi.getvar(selectedFastbootDeviceId, trimmed, operationId).then(
            (value) => {
              setFastbootGetvarValue(value);
              setFastbootVarMap((current) => ({
                ...current,
                [trimmed]: value,
              }));
              setFastbootVarEntries((current) => {
                const index = current.findIndex((entry) => entry.key === trimmed);
                if (index === -1) {
                  return [...current, { key: trimmed, value }];
                }
                const next = [...current];
                next[index] = { key: trimmed, value };
                return next;
              });
              setFastbootVarRawLines((current) => {
                const line = `${trimmed}: ${value}`;
                const index = current.findIndex((item) => item.startsWith(`${trimmed}:`));
                if (index === -1) {
                  return [...current, line];
                }
                const next = [...current];
                next[index] = line;
                return next;
              });
            }
          ),
      });
    } finally {
      setIsFastbootGetvarSingleRunning(false);
    }
  };

  const handleSelectFastbootImage = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: 'Select Image to Flash',
      filters: [{ name: 'Images', extensions: ['img'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (path) {
      setFastbootImagePath(path);
      toast.success('Image selected');
    }
  };

  const handleFastbootFlash = async () => {
    if (!ensureFastbootDevice()) return;
    if (!fastbootPartition || !fastbootImagePath) {
      toast.error('Select a partition and image');
      return;
    }
    if (isFastbootFlashRunning) return;

    setIsFastbootFlashRunning(true);
    try {
      await runOperation(
        {
          operation: `Fastboot flash ${fastbootPartition}`,
          type: 'write',
          partitionName: fastbootPartition,
          partitionSize: 'flash',
          successMessage: 'Flash completed',
          run: (operationId) =>
            FastbootToolsApi.flash(
              selectedFastbootDeviceId,
              fastbootPartition,
              fastbootImagePath,
              operationId
            ),
        },
        { longRunning: true }
      );
    } finally {
      setIsFastbootFlashRunning(false);
    }
  };

  const handleFastbootErase = async () => {
    if (!ensureFastbootDevice()) return;
    const trimmed = fastbootErasePartition.trim();
    if (!trimmed) {
      toast.error('Enter a partition name first');
      return;
    }
    if (isFastbootEraseRunning) return;

    const confirmed = await confirm({
      title: '⚠️ Erase Partition',
      message: (
        <div>
          <p className="font-semibold text-[var(--danger)] mb-2">This will permanently erase:</p>
          <p className="font-mono text-sm bg-[var(--surface-alt)] p-2 rounded">{trimmed}</p>
          <p className="mt-3">Are you sure you want to continue?</p>
        </div>
      ),
      variant: 'danger',
      confirmText: 'Erase',
    });

    if (!confirmed) {
      toast('Erase cancelled', { icon: 'ℹ️' });
      return;
    }

    setIsFastbootEraseRunning(true);
    try {
      await runOperation({
        operation: `Fastboot erase ${trimmed}`,
        type: 'write',
        partitionName: trimmed,
        partitionSize: 'erase',
        successMessage: `Erased ${trimmed} successfully`,
        run: (operationId) =>
          FastbootToolsApi.erase(selectedFastbootDeviceId, trimmed, operationId),
      });
    } finally {
      setIsFastbootEraseRunning(false);
    }
  };

  const handleFastbootSetActiveSlot = async () => {
    if (!ensureFastbootDevice()) return;
    if (isFastbootSlotRunning) return;

    setIsFastbootSlotRunning(true);
    try {
      const result = await runOperation({
        operation: `Fastboot set active slot ${fastbootSlotSelection.toUpperCase()}`,
        type: 'write',
        partitionName: 'fastboot',
        partitionSize: `slot ${fastbootSlotSelection}`,
        successMessage: `Active slot set to ${fastbootSlotSelection.toUpperCase()}`,
        run: (operationId) =>
          FastbootToolsApi.setActiveSlot(
            selectedFastbootDeviceId,
            fastbootSlotSelection,
            operationId
          ),
      });

      if (result.success) {
        setFastbootVarMap((current) => ({
          ...current,
          'current-slot': fastbootSlotSelection,
        }));
        setFastbootVarEntries((current) => {
          const index = current.findIndex((entry) => entry.key === 'current-slot');
          if (index === -1) {
            return [...current, { key: 'current-slot', value: fastbootSlotSelection }];
          }
          const next = [...current];
          next[index] = { key: 'current-slot', value: fastbootSlotSelection };
          return next;
        });
        setFastbootVarRawLines((current) => {
          const line = `current-slot: ${fastbootSlotSelection}`;
          const index = current.findIndex((item) => item.startsWith('current-slot:'));
          if (index === -1) {
            return [...current, line];
          }
          const next = [...current];
          next[index] = line;
          return next;
        });
      }
    } finally {
      setIsFastbootSlotRunning(false);
    }
  };

  const handleFastbootReboot = async (mode: FastbootRebootMode | 'fastbootd') => {
    if (!ensureFastbootDevice()) return;
    if (isFastbootRebootRunning) return;

    setIsFastbootRebootRunning(true);
    try {
      if (mode === 'fastbootd') {
        await runOperation({
          operation: 'Fastboot reboot fastbootd',
          type: 'write',
          partitionName: 'fastboot',
          partitionSize: 'fastbootd',
          successMessage: 'Rebooting to fastbootd',
          run: (operationId) =>
            FastbootToolsApi.rebootFastbootd(selectedFastbootDeviceId, operationId),
        });
      } else {
        await runOperation({
          operation: `Fastboot reboot ${mode}`,
          type: 'write',
          partitionName: 'fastboot',
          partitionSize: mode,
          successMessage: 'Reboot sent',
          run: (operationId) =>
            FastbootToolsApi.reboot(selectedFastbootDeviceId, mode, operationId),
        });
      }
    } finally {
      setIsFastbootRebootRunning(false);
    }
  };

  const handleFastbootRebootSelect = async (mode: FastbootRebootMode | 'fastbootd') => {
    setFastbootRebootMode(mode);
    await handleFastbootReboot(mode);
  };

  const handleRefreshAdbDevices = async () => {
    if (isAdbRefreshing) return;
    setIsAdbRefreshing(true);
    try {
      const devices = await AdbApi.listDevices();
        setAdbDevices(devices);
        setSelectedAdbDeviceId((current) => {
          if (devices.some((device) => device.id === current)) {
            return current;
          }
          return devices[0]?.id ?? '';
        });
    } catch {
      toast.error('Failed to list ADB devices');
    } finally {
      setIsAdbRefreshing(false);
    }
  };

  const handleAdbAuthCheck = async () => {
    if (!ensureAdbDevice()) return;
    if (isAdbAuthCheckRunning) return;

    setIsAdbAuthCheckRunning(true);
    try {
      await runOperation({
        operation: 'ADB authorization check',
        type: 'read',
        partitionName: 'adb',
        partitionSize: 'auth',
        successMessage: 'ADB authorized',
        run: (operationId) => AdbApi.authCheck(selectedAdbDeviceId, operationId),
      });
    } finally {
      setIsAdbAuthCheckRunning(false);
    }
  };

  const handleAdbList = async () => {
    if (!ensureAdbDevice()) return;
    if (!adbListPath.trim()) {
      toast.error('Enter a path to list');
      return;
    }
    if (isAdbFileRunning) return;

    setIsAdbFileRunning(true);
    try {
      await runOperation({
        operation: 'ADB list',
        type: 'read',
        partitionName: 'adb',
        partitionSize: 'list',
        successMessage: 'Directory listed',
        run: (operationId) =>
          AdbApi.list(selectedAdbDeviceId, adbListPath.trim(), operationId).then((entries) => {
            setAdbListResults(entries);
          }),
      });
    } finally {
      setIsAdbFileRunning(false);
    }
  };

  const handleSelectAdbPushLocal = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: 'Select File to Push',
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    if (path) {
      setAdbPushLocalPath(path);
      toast.success('File selected');
    }
  };

  const handleAdbPush = async () => {
    if (!ensureAdbDevice()) return;
    if (!adbPushLocalPath || !adbPushRemotePath.trim()) {
      toast.error('Select a local file and remote path');
      return;
    }
    const fileName = getFileName(adbPushLocalPath);
    if (!fileName) {
      toast.error('Failed to resolve local filename');
      return;
    }
    const trimmedRemotePath = adbPushRemotePath.trim();
    const baseRemotePath = trimmedRemotePath.endsWith('/')
      ? trimmedRemotePath.slice(0, -1)
      : trimmedRemotePath;
    const effectiveRemotePath = `${baseRemotePath}/${fileName}`;
    if (isAdbFileRunning) return;

    setIsAdbFileRunning(true);
    setAdbTransferStatus('Pushing...');
    try {
      await runOperation(
        {
          operation: 'ADB push',
          type: 'write',
          partitionName: 'adb',
          partitionSize: 'push',
          successMessage: 'Push completed',
          run: (operationId) =>
            AdbApi.push(
              selectedAdbDeviceId,
              adbPushLocalPath,
              effectiveRemotePath,
              operationId
            ),
        },
        { longRunning: true }
      );
    } finally {
      setIsAdbFileRunning(false);
      setAdbTransferStatus(null);
    }
  };

  const handleSelectAdbPullLocal = async () => {
    const path = await saveFile({
      title: 'Save Pulled File',
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    if (path) {
      setAdbPullLocalPath(path);
      toast.success('Save path selected');
    }
  };

  const handleAdbPull = async () => {
    if (!ensureAdbDevice()) return;
    if (!adbPullRemotePath.trim() || !adbPullLocalPath) {
      toast.error('Select a remote path and save location');
      return;
    }
    if (isAdbFileRunning) return;

    setIsAdbFileRunning(true);
    setAdbTransferStatus('Pulling...');
    try {
      await runOperation(
        {
          operation: 'ADB pull',
          type: 'read',
          partitionName: 'adb',
          partitionSize: 'pull',
          successMessage: 'Pull completed',
          run: (operationId) =>
            AdbApi.pull(
              selectedAdbDeviceId,
              adbPullRemotePath.trim(),
              adbPullLocalPath,
              operationId
            ),
        },
        { longRunning: true }
      );
    } finally {
      setIsAdbFileRunning(false);
      setAdbTransferStatus(null);
    }
  };

  const handleSelectAdbInstallApk = async () => {
    const path = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: 'Select APK File',
      filters: [{ name: 'APK Files', extensions: ['apk'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (path) {
      setAdbInstallApkPath(path);
      toast.success('APK selected');
    }
  };

  const handleAdbInstall = async () => {
    if (!ensureAdbDevice()) return;
    if (!adbInstallApkPath) {
      toast.error('Select an APK first');
      return;
    }
    if (isAdbPackageRunning) return;

    setIsAdbPackageRunning(true);
    try {
      await runOperation({
        operation: 'ADB install',
        type: 'write',
        partitionName: 'adb',
        partitionSize: 'install',
        successMessage: 'Install completed',
        run: (operationId) =>
          AdbApi.install(selectedAdbDeviceId, adbInstallApkPath, operationId),
      });
    } finally {
      setIsAdbPackageRunning(false);
    }
  };

  const handleAdbUninstall = async () => {
    if (!ensureAdbDevice()) return;
    if (!adbUninstallPackage.trim()) {
      toast.error('Enter a package name');
      return;
    }
    if (isAdbPackageRunning) return;

    setIsAdbPackageRunning(true);
    try {
      await runOperation({
        operation: 'ADB uninstall',
        type: 'write',
        partitionName: 'adb',
        partitionSize: 'uninstall',
        successMessage: 'Uninstall completed',
        run: (operationId) =>
          AdbApi.uninstall(selectedAdbDeviceId, adbUninstallPackage.trim(), operationId),
      });
    } finally {
      setIsAdbPackageRunning(false);
    }
  };

  const handleAdbSystemAction = async (action: string) => {
    if (!ensureAdbDevice()) return;
    if (isAdbSystemRunning) return;

    setIsAdbSystemRunning(true);
    try {
      await runOperation({
        operation: `ADB ${action}`,
        type: 'write',
        partitionName: 'adb',
        partitionSize: action,
        successMessage: `ADB ${action} completed`,
        run: (operationId) => AdbApi.systemAction(selectedAdbDeviceId, action, operationId),
      });
    } finally {
      setIsAdbSystemRunning(false);
    }
  };

  const handleAdbReboot = async (mode: AdbRebootMode) => {
    if (!ensureAdbDevice()) return;
    if (isAdbSystemRunning) return;

    setIsAdbSystemRunning(true);
    try {
      await runOperation({
        operation: `ADB reboot ${mode}`,
        type: 'write',
        partitionName: 'adb',
        partitionSize: 'reboot',
        successMessage: `Rebooting to ${mode}`,
        run: (operationId) => AdbApi.reboot(selectedAdbDeviceId, mode, operationId),
      });
    } finally {
      setIsAdbSystemRunning(false);
    }
  };

  const handleAdbRebootSelect = async (mode: AdbRebootMode) => {
    setAdbRebootMode(mode);
    await handleAdbReboot(mode);
  };

  const handleAdbScreenshot = async () => {
    if (!ensureAdbDevice()) return;
    if (!defaultOutputPath) {
      toast.error('Set a default output path first');
      return;
    }
    if (isAdbScreenshotRunning) return;

    setIsAdbScreenshotRunning(true);
    try {
      await runOperation({
        operation: 'ADB screenshot',
        type: 'read',
        partitionName: 'adb',
        partitionSize: 'framebuffer',
        successMessage: 'Screenshot saved',
        run: (operationId) =>
          AdbApi.framebufferSave(selectedAdbDeviceId, operationId).then(() => undefined),
      });
    } finally {
      setIsAdbScreenshotRunning(false);
    }
  };

  const fastbootSelectedDevice = useMemo(
    () => fastbootDevices.find((device) => device.id === selectedFastbootDeviceId),
    [fastbootDevices, selectedFastbootDeviceId]
  );

  const fastbootProduct =
    fastbootVarMap.product ??
    fastbootVarMap['product-name'] ??
    fastbootSelectedDevice?.product ??
    '—';
  const fastbootSerial =
    fastbootVarMap.serialno ??
    fastbootVarMap['serial-number'] ??
    fastbootVarMap.serial ??
    fastbootSelectedDevice?.serialNumber ??
    '—';
  const unlockedValue = fastbootVarMap.unlocked;
  const unlockedLabel = unlockedValue
    ? ['1', 'true', 'yes'].includes(unlockedValue.toLowerCase())
      ? 'Yes'
      : ['0', 'false', 'no'].includes(unlockedValue.toLowerCase())
        ? 'No'
        : unlockedValue
    : '—';
  const currentSlot = fastbootVarMap['current-slot'] ?? null;
  const hasSlotSupport =
    !!currentSlot ||
    Object.entries(fastbootVarMap).some(
      ([key, value]) => key.startsWith('has-slot:') && value.toLowerCase() === 'yes'
    );
  const hasDeviceInfo = fastbootVarEntries.length > 0 || fastbootVarRawLines.length > 0;

  const adbTransferProgress = isAdbFileRunning && progress ? progress.percentage : null;
  const adbTransferStatusLabel = isAdbFileRunning ? adbTransferStatus : null;

  return (
    <div className="h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      <div className="px-6 py-4 border-b border-[var(--border)] flex justify-end">
        <DeviceTabs
          tabs={[
            { id: 'adb', label: 'ADB' },
            { id: 'fastboot', label: 'Fastboot' },
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as 'adb' | 'fastboot')}
        />
      </div>

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'adb' ? (
          <AdbToolsGrid
            devices={adbDevices}
            selectedDeviceId={selectedAdbDeviceId}
            isRefreshing={isAdbRefreshing}
            isAuthCheckRunning={isAdbAuthCheckRunning}
            isFileOperationRunning={isAdbFileRunning}
            isPackageRunning={isAdbPackageRunning}
            isSystemActionRunning={isAdbSystemRunning}
            isScreenshotRunning={isAdbScreenshotRunning}
            listPath={adbListPath}
            pushLocalPath={adbPushLocalPath}
            pushRemotePath={adbPushRemotePath}
            pullRemotePath={adbPullRemotePath}
            pullLocalPath={adbPullLocalPath}
            installApkPath={adbInstallApkPath}
            uninstallPackage={adbUninstallPackage}
            listResults={adbListResults}
            transferProgress={adbTransferProgress}
            transferStatus={adbTransferStatusLabel}
            rebootMode={adbRebootMode}
            onRefresh={handleRefreshAdbDevices}
            onAuthCheck={handleAdbAuthCheck}
            onSelectDevice={setSelectedAdbDeviceId}
            onListPathChange={setAdbListPath}
            onList={handleAdbList}
            onSelectPushLocal={handleSelectAdbPushLocal}
            onPushRemoteChange={setAdbPushRemotePath}
            onPush={handleAdbPush}
            onSelectPullLocal={handleSelectAdbPullLocal}
            onPullRemoteChange={setAdbPullRemotePath}
            onPull={handleAdbPull}
            onSelectInstallApk={handleSelectAdbInstallApk}
            onInstall={handleAdbInstall}
            onUninstallPackageChange={setAdbUninstallPackage}
            onUninstall={handleAdbUninstall}
            onSystemAction={handleAdbSystemAction}
            onRebootSelect={handleAdbRebootSelect}
            onScreenshot={handleAdbScreenshot}
          />
        ) : (
          <FastbootToolsGrid
            devices={fastbootDevices}
            selectedDeviceId={selectedFastbootDeviceId}
            isRefreshing={isFastbootRefreshing}
            isGetvarRunning={isFastbootGetvarRunning}
            isGetvarSingleRunning={isFastbootGetvarSingleRunning}
            isFlashRunning={isFastbootFlashRunning}
            isEraseRunning={isFastbootEraseRunning}
            isRebootRunning={isFastbootRebootRunning}
            isSlotRunning={isFastbootSlotRunning}
            flashImagePath={fastbootImagePath}
            flashPartition={fastbootPartition}
            getvarName={fastbootGetvarName}
            getvarValue={fastbootGetvarValue}
            erasePartition={fastbootErasePartition}
            deviceInfoFields={[
              { label: 'Product', value: fastbootProduct },
              { label: 'Serial', value: fastbootSerial },
              { label: 'Unlocked', value: unlockedLabel },
              { label: 'Current Slot', value: currentSlot ?? '—' },
            ]}
            hasDeviceInfo={hasDeviceInfo}
            rawDeviceInfoLines={fastbootVarRawLines}
            hasSlotSupport={hasSlotSupport}
            currentSlot={currentSlot}
            rebootMode={fastbootRebootMode}
            slotSelection={fastbootSlotSelection}
            onSelectDevice={setSelectedFastbootDeviceId}
            onRefresh={handleRefreshFastbootDevices}
            onGetvarAll={handleGetvarAll}
            onGetvarSingle={handleGetvarSingle}
            onGetvarNameChange={setFastbootGetvarName}
            onSelectFlashImage={handleSelectFastbootImage}
            onFlashPartitionChange={setFastbootPartition}
            onFlash={handleFastbootFlash}
            onErasePartitionChange={setFastbootErasePartition}
            onErase={handleFastbootErase}
            onRebootSelect={handleFastbootRebootSelect}
            onSlotSelectionChange={setFastbootSlotSelection}
            onSetActiveSlot={handleFastbootSetActiveSlot}
          />
        )}
      </main>
    </div>
  );
}
