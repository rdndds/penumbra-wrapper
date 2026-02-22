interface FlashActionBarProps {
  selectedCount: number;
  selectedWithImagesCount: number;
  missingImagesCount: number;
  canFlash: boolean;
  onFlash: () => void;
}

export function FlashActionBar({
  selectedCount,
  selectedWithImagesCount,
  missingImagesCount,
  canFlash,
  onFlash,
}: FlashActionBarProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-[var(--surface-alt)] rounded-lg border border-[var(--border)] flex-shrink-0">
      <div className="text-sm text-[var(--text-muted)]">
        <span className="font-semibold text-[var(--text)]">{selectedCount}</span> partitions selected
        {selectedCount > 0 && (
          <span className="ml-2">({selectedWithImagesCount} with images)</span>
        )}
      </div>
      <button
        onClick={onFlash}
        disabled={!canFlash}
        title={
          selectedCount === 0
            ? 'Select partitions to flash'
            : missingImagesCount > 0
              ? `${missingImagesCount} partition(s) missing image files`
              : 'Flash selected partitions'
        }
        className="px-6 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Flash Selected
      </button>
    </div>
  );
}
