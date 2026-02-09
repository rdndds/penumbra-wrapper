import { Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMemo } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { useFlasherStore } from '../store/flasherStore';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { useFileSelection } from '../hooks/useFileSelection';
import { ScatterApi } from '../services/api/scatterApi';
import { DialogType } from '../services/dialogs/fileDialogService';
import { FlasherHeader } from '../components/flasher/FlasherHeader';
import { ScatterInfoBar } from '../components/flasher/ScatterInfoBar';
import { FlashPartitionTable } from '../components/flasher/FlashPartitionTable';
import { FlashActionBar } from '../components/flasher/FlashActionBar';
import { ErrorHandler } from '../services/utils/errorHandler';

export function Flasher() {
  const { daPath, isSettingsLoading, isConnecting } = useDeviceStore();
  const { connect, isConnected } = useDeviceConnection();
  const { selectFile } = useFileSelection();
  const {
    scatterFile,
    isLoadingScatter,
    selectedPartitions,
    partitionImages,
    setScatterFile,
    setLoadingScatter,
    setSelectedPartitions,
    setPartitionImages,
    togglePartitionSelection,
  } = useFlasherStore();

  const handleSelectScatter = async () => {
    const selected = await selectFile(DialogType.SCATTER_FILE, undefined, {
      title: 'Select Scatter File',
    });

    if (selected) {
      setLoadingScatter(true);

      // Clear previous state before loading new scatter file
      setSelectedPartitions(new Set());
      setPartitionImages(new Map());

      try {
        // Automatically parse the scatter file
        const parsed = await ScatterApi.parseScatterFile(selected as string);

        setScatterFile(parsed);

        // Auto-detect image files
        const detectedImages = await ScatterApi.detectImageFiles(selected as string, parsed.partitions);

        setPartitionImages(detectedImages);

        // Only auto-select partitions that have image files detected
        const partitionsWithImages = new Set(
          parsed.partitions
            .filter((p) => p.is_download && detectedImages.has(p.partition_name))
            .map((p) => p.partition_name)
        );
        setSelectedPartitions(partitionsWithImages);

        const downloadableCount = parsed.partitions.filter((p) => p.is_download).length;
        toast.success(`Loaded ${downloadableCount} downloadable partitions from ${parsed.platform}`);
      } catch (error: unknown) {
        // ErrorHandler now extracts message from structured errors automatically
        ErrorHandler.handle(error, 'Parse scatter file', {
          customMessage: 'Failed to parse scatter file',
        });
        setScatterFile(null);
      } finally {
        setLoadingScatter(false);
      }
    }
  };

  const handleConnectDevice = async () => {
    await connect();
  };

  const handleTogglePartition = (partitionName: string) => {
    togglePartitionSelection(partitionName);
  };

  const handleSelectImage = async (partitionName: string) => {
    const selected = await selectFile(DialogType.IMAGE_FILE, undefined, {
      title: `Select Image for ${partitionName}`,
      filters: [
        { name: 'Image Files', extensions: ['img', 'bin'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (selected) {
      const next = new Map(partitionImages);
      next.set(partitionName, selected as string);
      setPartitionImages(next);

      // Also auto-select this partition when image is selected
      const nextSelected = new Set(selectedPartitions);
      nextSelected.add(partitionName);
      setSelectedPartitions(nextSelected);

      toast.success(`Image selected for ${partitionName}`);
    }
  };

  const handleSelectAll = () => {
    if (!scatterFile) return;
    const partitionsWithImages = new Set(
      scatterFile.partitions
        .filter((p) => p.is_download && partitionImages.has(p.partition_name))
        .map((p) => p.partition_name)
    );
    setSelectedPartitions(partitionsWithImages);
  };

  const handleClearAll = () => {
    setSelectedPartitions(new Set());
  };

  // Memoize derived state to avoid unnecessary recalculations
  const downloadPartitions = useMemo(
    () => scatterFile?.partitions.filter((p) => p.is_download) || [],
    [scatterFile]
  );

  const selectedCount = selectedPartitions.size;
  
  // Calculate how many selected partitions have image files
  const selectedWithImagesCount = useMemo(
    () => Array.from(selectedPartitions).filter(name => partitionImages.has(name)).length,
    [selectedPartitions, partitionImages]
  );

  const missingImagesCount = selectedCount - selectedWithImagesCount;
  const canFlash = selectedCount > 0 && missingImagesCount === 0;

  return (
    <div className="h-screen bg-zinc-900 text-zinc-100 flex flex-col">
      <FlasherHeader
        daPath={daPath}
        isConnecting={isConnecting}
        isConnected={isConnected}
        isSettingsLoading={isSettingsLoading}
        isLoadingScatter={isLoadingScatter}
        onConnect={handleConnectDevice}
        onSelectScatter={handleSelectScatter}
      />

      <main className="flex-1 p-6 flex flex-col overflow-hidden">
        {!scatterFile ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <Package className="w-20 h-20 text-zinc-700 mb-4" />
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">
              No Scatter File Loaded
            </h2>
            <p className="text-sm text-zinc-500">
              Load a scatter file (.txt or .xml) to begin batch flashing
            </p>
          </div>
        ) : (
          <>
            <ScatterInfoBar
              scatterFile={scatterFile}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
            />

            <FlashPartitionTable
              partitions={downloadPartitions}
              selectedPartitions={selectedPartitions}
              partitionImages={partitionImages}
              onTogglePartition={handleTogglePartition}
              onSelectImage={handleSelectImage}
            />

            <FlashActionBar
              selectedCount={selectedCount}
              selectedWithImagesCount={selectedWithImagesCount}
              missingImagesCount={missingImagesCount}
              canFlash={canFlash}
              onFlash={() => undefined}
            />
          </>
        )}
      </main>
    </div>
  );
}
