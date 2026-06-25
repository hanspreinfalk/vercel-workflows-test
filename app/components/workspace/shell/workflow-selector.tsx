"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type WorkflowSummary = {
  id: string;
  name: string;
  updatedAt: number;
};

type WorkflowSelectorProps = {
  flows: WorkflowSummary[];
  currentFlowId?: string | null;
};

export function WorkflowSelector({
  flows: initialFlows,
  currentFlowId,
}: WorkflowSelectorProps) {
  const router = useRouter();
  const [flows, setFlows] = useState(initialFlows);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current =
    flows.find((flow) => flow.id === currentFlowId) ?? flows[0] ?? null;

  useEffect(() => {
    setFlows(initialFlows);
  }, [initialFlows]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function handleCreate() {
    setCreating(true);
    try {
      const response = await fetch("/api/builder/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled workflow" }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as {
        flow: WorkflowSummary;
      };

      setFlows((current) => [data.flow, ...current]);
      setOpen(false);
      router.push(`/builder/${data.flow.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="workspace-input flex w-[min(100%,220px)] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition hover:border-[var(--border-strong)] sm:w-[240px]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--text-secondary)]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7ZM3.5 4a.5.5 0 0 0-.5.5V6h11V4.5a.5.5 0 0 0-.5-.5h-9ZM13 7H3v4.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7Z" />
          </svg>
        </span>
        <span className="truncate">{current?.name ?? "Select workflow"}</span>
        <svg
          viewBox="0 0 16 16"
          className={`ml-auto h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition ${open ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path d="M4.5 6.5 8 10l3.5-3.5-.7-.7L8 8.6 5.2 5.8l-.7.7Z" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className="workspace-shadow-soft absolute left-0 z-[100] mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]"
        >
          <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-tertiary)]">
            Your workflows
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {flows.length === 0 ? (
              <p className="px-3 py-4 text-sm text-[var(--text-secondary)]">
                No workflows yet
              </p>
            ) : (
              flows.map((flow) => {
                const selected = flow.id === currentFlowId;
                return (
                  <button
                    key={flow.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/builder/${flow.id}`);
                    }}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--surface-muted)] ${
                      selected ? "bg-[var(--surface-muted)]" : ""
                    }`}
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {flow.name}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      Updated {new Date(flow.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="flex w-full items-center gap-2 border-t border-[var(--border)] px-3 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
          >
            <span className="text-lg leading-none">+</span>
            {creating ? "Creating…" : "New workflow"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
