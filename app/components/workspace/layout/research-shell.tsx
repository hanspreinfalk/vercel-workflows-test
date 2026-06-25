"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SearchComposer } from "@/app/components/workspace/features/search-composer";

export function ResearchShell({
  title,
  meta,
  search,
  filters,
  list,
  children,
  className,
  detailOpen = false,
}: {
  title: string;
  meta?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon?: ReactNode;
  };
  filters?: ReactNode;
  list: ReactNode;
  children: ReactNode;
  className?: string;
  /** On small screens, hide the sidebar when viewing detail content */
  detailOpen?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-[var(--canvas)] md:flex-row",
        detailOpen && "max-md:[&>aside]:hidden max-md:[&>main]:min-h-0 max-md:[&>main]:flex-1",
        className
      )}
    >
      <aside
        className={cn(
          "flex w-full min-h-0 max-md:max-h-[min(42vh,320px)] shrink-0 flex-col border-b border-[var(--border)] bg-[var(--surface)] md:w-[min(100%,300px)] md:border-r md:border-b-0"
        )}
      >
        <div className="shrink-0 px-4 pt-5 pb-3">
          <h1 className="text-lg font-medium tracking-tight text-[var(--text-primary)] leading-snug">
            {title}
          </h1>
          {meta ? (
            <p className="mt-1 text-[0.8125rem] text-[var(--text-tertiary)]">
              {meta}
            </p>
          ) : null}
        </div>

        {search || filters ? (
          <div className="flex shrink-0 flex-col gap-2.5 px-3 pb-3">
            {search ? (
              <SearchComposer
                value={search.value}
                onChange={search.onChange}
                placeholder={search.placeholder}
                icon={search.icon}
              />
            ) : null}
            {filters ? (
              <div className="flex flex-wrap gap-1.5 max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-0.5 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden [&_button]:max-md:shrink-0">
                {filters}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-1 pb-3">
          {list}
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--canvas)]">
        {children}
      </main>
    </div>
  );
}

export function ResearchThread({
  active,
  onClick,
  title,
  preview,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  preview?: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-[0.625rem] border-none bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-muted)]",
        active && "bg-[var(--surface-elevated)]"
      )}
    >
      <span className="truncate text-sm font-medium leading-snug text-[var(--text-primary)]">
        {title}
      </span>
      {preview ? (
        <span className="line-clamp-2 text-[0.8125rem] leading-snug text-[var(--text-secondary)]">
          {preview}
        </span>
      ) : null}
      {meta ? (
        <span className="mt-1 text-xs text-[var(--text-tertiary)]">{meta}</span>
      ) : null}
    </button>
  );
}

export function ResearchMainEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-lg font-medium text-[var(--text-primary)]">{title}</p>
      <p className="max-w-80 text-[0.9375rem] leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

export function ResearchDetailBar({
  title,
  subtitle,
  leading,
  trailing,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--canvas)] px-4 py-3.5 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leading}
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium text-[var(--text-primary)]">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[0.8125rem] text-[var(--text-tertiary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {trailing ? (
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2 max-md:w-full max-md:justify-start">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

export function ResearchDetailBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          "mx-auto w-full max-w-[44rem] px-4 pt-5 pb-8 sm:px-6 sm:pt-7 sm:pb-10",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

