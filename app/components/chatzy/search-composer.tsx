"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SearchComposer({
  value,
  onChange,
  placeholder,
  icon,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("chatzy-composer", className)}>
      {icon ? <span className="chatzy-composer__icon">{icon}</span> : null}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}
