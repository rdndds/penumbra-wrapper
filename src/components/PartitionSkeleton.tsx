import { memo } from 'react';

export const PartitionSkeleton = memo(() => {
  return (
    <div className="space-y-4 flex flex-col h-full animate-pulse">
      {/* Search Skeleton */}
      <div className="h-10 bg-zinc-800 rounded-lg flex-shrink-0" />

      {/* Table Skeleton */}
      <div className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden flex flex-col">
        {/* Header Skeleton */}
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_2fr] gap-4 px-4 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="h-4 bg-zinc-700 rounded w-16" />
          <div className="h-4 bg-zinc-700 rounded w-12" />
          <div className="h-4 bg-zinc-700 rounded w-12" />
          <div className="h-4 bg-zinc-700 rounded w-20 mx-auto" />
        </div>

        {/* Body Skeleton - 8 rows */}
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[2fr_1.5fr_1.5fr_2fr] gap-4 px-4 py-3 border-b border-zinc-700/50"
            >
              <div className="h-4 bg-zinc-700 rounded" />
              <div className="h-4 bg-zinc-700 rounded" />
              <div className="h-4 bg-zinc-700 rounded" />
              <div className="flex items-center justify-center gap-2">
                <div className="h-8 w-16 bg-zinc-700 rounded" />
                <div className="h-8 w-16 bg-zinc-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Count Skeleton */}
      <div className="h-4 bg-zinc-800 rounded w-48 flex-shrink-0" />
    </div>
  );
});
