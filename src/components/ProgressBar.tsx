interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  status?: string;
}

export function ProgressBar({
  progress,
  className = '',
  showPercentage = true,
  status,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={className}>
      {(showPercentage || status) && (
        <div className="mb-2 flex items-center justify-between text-sm">
          {status && <span className="text-zinc-400">{status}</span>}
          {showPercentage && (
            <span className="font-medium text-white">{clampedProgress.toFixed(1)}%</span>
          )}
        </div>
      )}
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
