"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SearchComposer } from "./search-composer";

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
        "research-shell",
        detailOpen && "research-shell--detail-open",
        className
      )}
    >
      <aside className="research-shell__sidebar">
        <div className="research-shell__sidebar-head">
          <h1>{title}</h1>
          {meta ? <p className="research-shell__sidebar-meta">{meta}</p> : null}
        </div>

        {search || filters ? (
          <div className="research-shell__sidebar-tools">
            {search ? (
              <SearchComposer
                value={search.value}
                onChange={search.onChange}
                placeholder={search.placeholder}
                icon={search.icon}
              />
            ) : null}
            {filters ? (
              <div className="research-shell__filters">{filters}</div>
            ) : null}
          </div>
        ) : null}

        <div className="research-shell__list">{list}</div>
      </aside>

      <main className="research-shell__main">{children}</main>
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
      className={cn("research-thread", active && "research-thread--active")}
    >
      <span className="research-thread__title">{title}</span>
      {preview ? (
        <span className="research-thread__preview">{preview}</span>
      ) : null}
      {meta ? <span className="research-thread__meta">{meta}</span> : null}
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
    <div className="research-main-empty">
      <p className="research-main-empty__title">{title}</p>
      <p className="research-main-empty__desc">{description}</p>
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
    <div className="research-detail-bar">
      <div className="research-detail-bar__leading">
        {leading}
        <div className="min-w-0">
          <p className="research-detail-bar__title">{title}</p>
          {subtitle ? (
            <p className="research-detail-bar__sub">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {trailing ? (
        <div className="research-detail-bar__trailing">{trailing}</div>
      ) : null}
    </div>
  );
}

export function ResearchSegment({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="research-segment" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "research-segment__btn",
            active === tab.id && "research-segment__btn--active"
          )}
        >
          {tab.label}
        </button>
      ))}
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
    <div className="research-detail-body">
      <div className={cn("research-detail-body__inner", className)}>
        {children}
      </div>
    </div>
  );
}

export function ResearchStatus({
  status,
  label,
}: {
  status: "completed" | "analyzing" | "scheduled";
  label: string;
}) {
  return (
    <span className={`research-status research-status--${status}`}>
      <span className="research-status__dot" />
      {label}
    </span>
  );
}
