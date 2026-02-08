import { useState, useEffect, useCallback, memo } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import type { Partition } from '../types';
import { PartitionApi } from '../services/api/partitionApi';
import { executeOperation } from '../services/operations/executeOperation';
import { DialogType } from '../services/dialogs/fileDialogService';
import { generateTimestampedFilename, joinPath, getBasename } from '../services/utils/pathUtils';
import { X, FolderOpen, AlertTriangle } from 'lucide-react';
import { exists } from '@tauri-apps/plugin-fs';
import { useFileSelection } from '../hooks/useFileSelection';

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  partition: Partition | null;
  operation: 'read' | 'write';
}

export const OperationModal = memo<OperationModalProps>(({
  isOpen,
  onClose,
  partition,
  operation,
}) => {
  const { daPath, preloaderPath, defaultOutputPath } = useDeviceStore();
  const { selectFile, saveFile } = useFileSelection();
  const [filePath, setFilePath] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const checkFileExists = useCallback(async (path: string) => {
    try {
      const fileExists = await exists(path);
      setShowOverwriteConfirm(fileExists);
    } catch (error) {
      console.error('Error checking file existence:', error);
    }
  }, []);

  useEffect(() => {
    // Reset and setup when modal opens
    if (isOpen && partition) {
      setFilePath('');
      setIsExecuting(false);
      setShowOverwriteConfirm(false);

      // For read operations with default output path set
      if (operation === 'read' && defaultOutputPath) {
        const filename = generateTimestampedFilename(partition.name, 'img');
        const autoPath = joinPath(defaultOutputPath, filename);
        setFilePath(autoPath);

        // Check if file exists
        checkFileExists(autoPath);
      }
    }
  }, [isOpen, partition, operation, defaultOutputPath, checkFileExists]);

  useEffect(() => {
    if (!isOpen) return;
    if (operation !== 'read') {
      setShowOverwriteConfirm(false);
      return;
    }
    if (!filePath) {
      setShowOverwriteConfirm(false);
      return;
    }

    checkFileExists(filePath);
  }, [filePath, operation, isOpen, checkFileExists]);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExecuting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExecuting, onClose]);

  const handleBrowse = useCallback(async () => {
    if (operation === 'write') {
      // Select image file
      const selected = await selectFile(DialogType.IMAGE_FILE, undefined, {
        title: 'Select Image File',
      });
      if (selected) {
        setFilePath(selected as string);
      }
    } else {
      // Save location for read
      const defaultName = generateTimestampedFilename(partition?.name || 'partition', 'img');

      // Use default output path if available
      const defaultPath = defaultOutputPath
        ? joinPath(defaultOutputPath, defaultName)
        : defaultName;

      const selected = await saveFile({
        title: 'Save Partition Backup',
        defaultPath,
        defaultExtension: 'img',
      });
      if (selected) {
        setFilePath(selected as string);
        setShowOverwriteConfirm(false); // Reset confirmation if user picks new location
      }
    }
  }, [operation, partition, defaultOutputPath, selectFile, saveFile]);

  const handleStart = useCallback(async (forceOverwrite: boolean = false) => {
    if (!partition || !filePath) return;

    // If file exists and user hasn't confirmed, show warning
    if (showOverwriteConfirm && !forceOverwrite) {
      return; // Don't proceed, wait for user confirmation
    }

    setIsExecuting(true);
    
    // Close modal immediately with animation
    onClose();

    try {
      if (operation === 'write') {
        await executeOperation({
          operation: 'Write partition',
          type: 'write',
          partitionName: partition.name,
          partitionSize: partition.display_size,
          successMessage: `Successfully flashed ${partition.name}`,
          run: (operationId) =>
            PartitionApi.write({
              daPath: daPath!,
              partition: partition.name,
              imagePath: filePath,
              preloaderPath: preloaderPath || undefined,
              operationId,
            }),
        });
      } else {
        await executeOperation({
          operation: 'Read partition',
          type: 'read',
          partitionName: partition.name,
          partitionSize: partition.display_size,
          successMessage: `Successfully read ${partition.name}`,
          run: (operationId) =>
            PartitionApi.read({
              daPath: daPath!,
              partition: partition.name,
              outputPath: filePath,
              preloaderPath: preloaderPath || undefined,
              operationId,
            }),
        });
      }
    } finally {
      setIsExecuting(false);
    }
  }, [partition, filePath, showOverwriteConfirm, operation, daPath, preloaderPath, onClose]);

  const handleOverwrite = useCallback(() => {
    setShowOverwriteConfirm(false);
    handleStart(true);
  }, [handleStart]);

  const handleChooseDifferent = useCallback(() => {
    setShowOverwriteConfirm(false);
    handleBrowse();
  }, [handleBrowse]);

  if (!isOpen || !partition) return null;

  const canStart = filePath && !isExecuting && !showOverwriteConfirm;
  const getFilename = (path: string) => getBasename(path);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center transition-opacity duration-200"
        onClick={!isExecuting ? onClose : undefined}
      >
        {/* Modal */}
        <div
          className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md shadow-2xl transition-all duration-200 relative"
          onClick={(e) => e.stopPropagation()}
          style={{
            animation: isOpen ? 'modalEnter 200ms ease-out' : undefined,
          }}
        >
          {/* Overwrite Confirmation Overlay */}
          {showOverwriteConfirm && (
            <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-6 z-10 rounded-lg border-2 border-yellow-600">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-100 mb-2 text-center">
                File Already Exists
              </h3>
              <p className="text-sm text-zinc-400 mb-6 text-center">
                The output file already exists. Do you want to overwrite it?
              </p>
              <p className="text-xs text-zinc-500 mb-6 text-center font-mono break-all max-w-full px-4">
                {filePath}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleChooseDifferent}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded transition-colors"
                >
                  Choose Different
                </button>
                <button
                  onClick={handleOverwrite}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded transition-colors"
                >
                  Overwrite
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-100">
              {operation === 'write' ? 'Write' : 'Read'} Partition
            </h2>
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="p-1 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Partition Info */}
            <div className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-1">Partition</div>
              <div className="font-mono text-sm text-zinc-200">
                {partition.name}
              </div>
              {partition.display_size && (
                <div className="text-xs text-zinc-400 mt-1">
                  Size: {partition.display_size}
                </div>
              )}
            </div>

            {/* File Path */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {operation === 'write' ? 'Image File' : 'Output File'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder={operation === 'write' ? 'Select image file...' : 'Select output location...'}
                  disabled={isExecuting}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={handleBrowse}
                  disabled={isExecuting}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors disabled:opacity-50"
                  title="Browse"
                >
                  <FolderOpen className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
              {filePath && (
                <div className="mt-2 text-xs text-zinc-500 break-all">
                  {getFilename(filePath)}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleStart()}
              disabled={!canStart}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? 'Starting...' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

OperationModal.displayName = 'OperationModal';
