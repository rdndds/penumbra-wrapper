import { Rocket } from 'lucide-react';

interface FastbootSectionProps {
  isRunning: boolean;
  onForceFastboot: () => void;
}

export function FastbootSection({ isRunning, onForceFastboot }: FastbootSectionProps) {
  return (
    <section className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[var(--primary-soft)] rounded-lg">
            <Rocket className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Force Fastboot</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Attempts a preloader handshake to switch MTK devices into Fastboot mode.
            </p>
          </div>
        </div>
        <button
          onClick={onForceFastboot}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Attempting...' : 'Force Fastboot'}
        </button>
      </div>
    </section>
  );
}
