"use client";

import { cn } from "@/lib/utils";

export function SegmentTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-muted p-0.5 max-md:flex-nowrap max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 rounded-full border-none bg-transparent px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            active === tab.id && "bg-card text-foreground shadow-sm"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
