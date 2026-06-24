"use client";

import { useEffect, useRef, useState } from "react";
import { ClaudeCodeIcon } from "@/app/components/icons/claude-code-icon";
import { ManualTriggerIcon } from "@/app/components/icons/manual-trigger-icon";
import { OpenCodeIcon } from "@/app/components/icons/open-code-icon";
import { StopIcon } from "@/app/components/icons/stop-icon";

type AddNodeMenuProps = {
  onAddManualTrigger: () => void;
  onAddClaudeCode: () => void;
  onAddOpenCode: () => void;
  onAddStopNode: () => void;
  onStopWorkflow: () => void;
  hasManualTrigger: boolean;
  canStopWorkflow: boolean;
  isStopping: boolean;
};

export function AddNodeMenu({
  onAddManualTrigger,
  onAddClaudeCode,
  onAddOpenCode,
  onAddStopNode,
  onStopWorkflow,
  hasManualTrigger,
  canStopWorkflow,
  isStopping,
}: AddNodeMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  function closeAndRun(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Add node
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 min-w-[210px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        >
          <button
            type="button"
            role="menuitem"
            disabled={hasManualTrigger}
            onClick={() => closeAndRun(onAddManualTrigger)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-900"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
              <ManualTriggerIcon className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
            </span>
            Start
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => closeAndRun(onAddClaudeCode)}
            className="flex w-full items-center gap-2 border-t border-zinc-200 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#C15F3C]/10">
              <ClaudeCodeIcon className="h-3.5 w-3.5 text-[#C15F3C]" />
            </span>
            Claude Code
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => closeAndRun(onAddOpenCode)}
            className="flex w-full items-center gap-2 border-t border-zinc-200 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-500/10">
              <OpenCodeIcon className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
            </span>
            OpenCode
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => closeAndRun(onAddStopNode)}
            className="flex w-full items-center gap-2 border-t border-zinc-200 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10">
              <StopIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </span>
            Stop node
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canStopWorkflow || isStopping}
            onClick={() => closeAndRun(onStopWorkflow)}
            className="flex w-full items-center gap-2 border-t border-zinc-200 bg-red-500/5 px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15">
              <StopIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </span>
            {isStopping ? "Stopping workflow…" : "Stop workflow"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
