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
      className={cn("research-mobile-back", hideAt, className)}
      aria-label={label}
    >
      <ChevronLeft className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
