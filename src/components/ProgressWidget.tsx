import { memo, useEffect, useState } from 'react';

interface ProgressWidgetProps {
  isActive: boolean;
  operationType: 'read' | 'write' | null;
  partitionName: string | null;
  partitionSize?: string;
  startTime: number | null;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const ProgressWidget = memo<ProgressWidgetProps>(({ 
  isActive, 
  operationType, 
  partitionName,
  partitionSize,
  startTime 
}) => {
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  // Update spinner animation
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSpinnerIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, [isActive]);

  // Update elapsed time
  useEffect(() => {
    if (!isActive || !startTime) return;

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  if (!isActive || !operationType || !partitionName) return null;

  const operationText = operationType === 'read' ? 'Reading' : 'Writing';

  return (
    <div className="p-4 bg-zinc-800/70 border-t border-b border-zinc-700/50">
      {/* Header: Operation + Partition Info */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-zinc-200">
            {operationText} '{partitionName}'
            {partitionSize && (
              <span className="ml-1.5 text-xs text-zinc-400 font-normal">
                ({partitionSize})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Spinner + Status */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl text-blue-400 animate-pulse">
          {SPINNER_FRAMES[spinnerIndex]}
        </span>
        <span className="text-sm text-zinc-400">
          {operationType === 'read' ? 'Uploading from device...' : 'Downloading to device...'}
        </span>
      </div>

      {/* Elapsed Timer */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-zinc-500 font-medium">Elapsed:</span>
          <span className="font-mono text-zinc-300 font-semibold">{elapsedTime}</span>
        </div>
      </div>
    </div>
  );
});

ProgressWidget.displayName = 'ProgressWidget';
