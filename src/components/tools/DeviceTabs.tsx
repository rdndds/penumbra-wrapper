import { cn } from '../../lib/utils';

interface DeviceTabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function DeviceTabs({ tabs, active, onChange }: DeviceTabsProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full transition',
              isActive
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
