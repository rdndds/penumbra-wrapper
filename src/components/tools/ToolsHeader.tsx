export function ToolsHeader() {
  return (
    <header className="border-b border-[var(--border)] p-4 bg-[var(--surface)] backdrop-blur-sm flex-shrink-0">
      <h1 className="text-xl font-semibold text-[var(--text)]">Advanced Tools</h1>
      <p className="text-sm text-[var(--text-subtle)] mt-1">
        Backup all partitions and manage bootloader settings
      </p>
    </header>
  );
}
