"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WorkspaceToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 sm:gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="workspace-stat">
      <p className="workspace-stat__value">{value}</p>
      <p className="workspace-stat__label">{label}</p>
      {hint ? <p className="workspace-stat__hint">{hint}</p> : null}
    </div>
  );
}

export function WorkspaceStatsRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {children}
    </div>
  );
}

export function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "workspace-filter-pill",
        active && "workspace-filter-pill--active"
      )}
    >
      {children}
    </button>
  );
}

export function WorkspaceListDetail({
  list,
  detail,
  emptyDetail,
  className,
}: {
  list: ReactNode;
  detail: ReactNode;
  emptyDetail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("workspace-split", className)}>
      <div className="workspace-split__list">{list}</div>
      <div className="workspace-split__detail">
        {detail}
        {emptyDetail}
      </div>
    </div>
  );
}

export function WorkspaceListItem({
  active,
  onClick,
  title,
  subtitle,
  meta,
  badge,
  leading,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  meta?: string;
  badge?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "workspace-list-item w-full text-left",
        active && "workspace-list-item--active"
      )}
    >
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {title}
            </p>
            {badge}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {subtitle}
          </p>
          {meta ? (
            <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function WorkspaceDetailEmpty({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="workspace-detail-empty">
      <div className="workspace-detail-empty__icon">{icon}</div>
      <p className="workspace-detail-empty__title">{title}</p>
      <p className="workspace-detail-empty__desc">{description}</p>
    </div>
  );
}

export function WorkspaceDetailTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="workspace-detail-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "workspace-detail-tabs__tab",
            active === tab.id && "workspace-detail-tabs__tab--active"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
