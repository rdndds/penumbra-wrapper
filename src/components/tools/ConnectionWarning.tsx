import { AlertTriangle } from 'lucide-react';

export function ConnectionWarning() {
  return (
    <div className="bg-[var(--warning-soft)] border border-[var(--warning)] rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-[var(--warning)]">Not Connected</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Please connect to a device in the Dashboard before using these tools.
        </p>
      </div>
    </div>
  );
}
