"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { CredentialField } from "@/lib/flow/credentials";
import { maskCredentialValue } from "@/lib/flow/credentials";
import { cn } from "@/lib/utils";

export function CredentialFieldInput({
  field,
  label,
  value,
  onChange,
  required = false,
  showReveal = true,
}: {
  field: CredentialField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  showReveal?: boolean;
}) {
  const isSecret = field.includes("Token") || field.includes("Key");
  const [revealed, setRevealed] = useState(false);
  const configured = Boolean(value.trim());
  const hasReveal = showReveal && isSecret && configured;

  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] font-medium text-[var(--text-tertiary)]">
          {label}
          {required ? (
            <span className="ml-0.5 text-[var(--destructive)]">*</span>
          ) : null}
        </span>
        <span
          className={cn(
            "text-[0.625rem] font-semibold uppercase tracking-wide",
            configured ? "text-[var(--brand)]" : "text-[var(--destructive)]"
          )}
        >
          {configured ? "Configured" : "Missing"}
        </span>
      </div>
      <div className="relative flex items-center">
        <input
          type={isSecret && !revealed ? "password" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            field === "githubRepoUrl"
              ? "https://github.com/org/repo"
              : `Enter ${label.toLowerCase()}`
          }
          className={cn(
            "w-full rounded-[0.625rem] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--brand)_45%,var(--border))]",
            hasReveal && "pr-9"
          )}
          autoComplete="off"
          spellCheck={false}
        />
        {hasReveal ? (
          <button
            type="button"
            className="absolute right-1.5 flex size-7 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-[background,color] duration-[120ms] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide value" : "Show value"}
            title={revealed ? "Hide" : "Show"}
          >
            {revealed ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </button>
        ) : null}
      </div>
      {configured && isSecret && !revealed ? (
        <p className="font-mono text-[0.6875rem] text-[var(--text-tertiary)]">
          {maskCredentialValue(value, true)}
        </p>
      ) : null}
    </label>
  );
}
