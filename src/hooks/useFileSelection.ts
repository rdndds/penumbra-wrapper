import { useState } from 'react';
import { FileDialogService, DialogType } from '../services/dialogs/fileDialogService';
import toast from 'react-hot-toast';

/**
 * Custom hook for file and folder selection dialogs.
 * 
 * Provides a simplified interface for:
 * - Opening file/folder selection dialogs
 * - Opening save file dialogs
 * - Handling selection callbacks
 * - Error handling
 * - Selection state tracking
 * 
 * @returns Object containing dialog methods and selection state
 * 
 * @example
 * ```tsx
 * const { selectFile, saveFile, isSelecting } = useFileSelection();
 * 
 * // Select a DA file
 * const handleSelectDA = async () => {
 *   const path = await selectFile('da', (path) => {
 *     console.log('Selected DA:', path);
 *     setDaPath(path);
 *   });
 * };
 * 
 * // Save a partition backup
 * const handleSave = async () => {
 *   const path = await saveFile({ defaultPath: 'backup.img', defaultExtension: 'img' });
 *   if (path) {
 *     // Perform save operation
 *   }
 * };
 * ```
 */
export function useFileSelection() {
  const [isSelecting, setIsSelecting] = useState(false);

  /**
   * Open a file or folder selection dialog.
   * 
   * @param type - Type of dialog to open (da, preloader, image, scatter, output, backup)
   * @param onSelect - Optional callback invoked when a file is selected
   * @returns Promise resolving to selected path or null if cancelled
   */
  const selectFile = async (
    type: DialogType,
    onSelect?: (path: string) => void | Promise<void>,
    overrides?: Parameters<typeof FileDialogService.selectFile>[1]
  ): Promise<string | null> => {
    setIsSelecting(true);
    try {
      const path = await FileDialogService.selectFile(type, overrides);
      if (path && onSelect) {
        await onSelect(path);
      }
      return path;
    } catch (error: unknown) {
      console.error('File selection error:', error);
      toast.error('Failed to open file dialog');
      return null;
    } finally {
      setIsSelecting(false);
    }
  };

  /**
   * Open a save file dialog.
   * 
   * @param defaultPath - Optional default file path (including filename)
   * @param defaultExtension - Default file extension ('img' or 'bin')
   * @returns Promise resolving to save path or null if cancelled
   */
  const saveFile = async (options?: {
    defaultPath?: string;
    defaultExtension?: 'img' | 'bin';
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string | null> => {
    setIsSelecting(true);
    try {
      const path = await FileDialogService.saveFile(options);
      return path;
    } catch (error: unknown) {
      console.error('Save file error:', error);
      toast.error('Failed to open save dialog');
      return null;
    } finally {
      setIsSelecting(false);
    }
  };

  return {
    selectFile,
    saveFile,
    isSelecting,
  };
}
