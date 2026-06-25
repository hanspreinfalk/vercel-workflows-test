"use client";

import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Participant } from "@/lib/workspace/types";

type WorkspaceEntityFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  participantFilter: string;
  onParticipantFilterChange: (value: string) => void;
  participants: Participant[];
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  trailing?: ReactNode;
};

export function WorkspaceEntityFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  participantFilter,
  onParticipantFilterChange,
  participants,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  hasActiveFilters,
  onClearFilters,
  trailing,
}: WorkspaceEntityFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>

      <Select
        value={participantFilter}
        onValueChange={(value) => onParticipantFilterChange(value ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="All people" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All people</SelectItem>
          {participants.map((participant) => (
            <SelectItem key={participant.id} value={participant.id}>
              {participant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {statusFilter !== undefined &&
      onStatusFilterChange &&
      statusOptions?.length ? (
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      ) : null}

      {trailing}
    </div>
  );
}

export function WorkspaceTableEmptyState({
  message,
  hasActiveFilters,
  onClearFilters,
}: {
  message: string;
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <SlidersHorizontal className="size-5 opacity-50" />
      <p className="text-sm">{message}</p>
      {hasActiveFilters && onClearFilters ? (
        <Button variant="link" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

export function WorkspaceTableFooter({
  showing,
  total,
  noun,
}: {
  showing: number;
  total: number;
  noun: string;
}) {
  return (
    <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
      Showing {showing} of {total} {noun}
    </div>
  );
}

export function WorkspacePageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
