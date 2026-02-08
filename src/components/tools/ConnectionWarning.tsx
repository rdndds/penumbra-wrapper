import { AlertTriangle } from 'lucide-react';

export function ConnectionWarning() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-amber-400">Not Connected</h3>
        <p className="text-sm text-zinc-400 mt-1">
          Please connect to a device in the Dashboard before using these tools.
        </p>
      </div>
    </div>
  );
}
