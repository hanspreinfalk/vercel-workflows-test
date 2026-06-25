"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBackButton({
  onClick,
  label = "Back",
  className,
  visibleBelow = "md",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
  /** Hide at this breakpoint and above (matches page layout) */
  visibleBelow?: "md" | "lg";
}) {
  const hideAt = visibleBelow === "lg" ? "lg:hidden" : "md:hidden";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        hideAt,
        className
      )}
      aria-label={label}
    >
      <ChevronLeft className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
