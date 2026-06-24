"use client";

import type { BuiltFlowProgressEvent } from "@/lib/flow-progress";
import type { FlowRunStatus } from "./use-flow-run-stream";

function formatLogLine(event: BuiltFlowProgressEvent): string {
  const time = new Date(event.timestamp).toLocaleTimeString();

  if (event.event === "log") {
    return `[${time}] ${event.message}`;
  }

  if (event.event === "cancelled") {
    return `[${time}] STOPPED: ${event.message}`;
  }

  if (event.event === "complete") {
    return `[${time}] COMPLETE: ${event.message}`;
  }

  if (event.event === "node") {
    const label = event.label ?? event.nodeId ?? "node";
    const status = event.status?.toUpperCase() ?? "UPDATE";
    const suffix = event.output
      ? `\n${event.output.slice(0, 500)}${event.output.length > 500 ? "…" : ""}`
      : "";
    return `[${time}] ${label} — ${status}: ${event.message}${suffix}`;
  }

  return `[${time}] ${event.message}`;
}

type FlowRunLogsPanelProps = {
  events: BuiltFlowProgressEvent[];
  runStatus: FlowRunStatus;
  onStop: () => void;
  isStopping: boolean;
};

export function FlowRunLogsPanel({
  events,
  runStatus,
  onStop,
  isStopping,
}: FlowRunLogsPanelProps) {
  const canStop =
    runStatus === "connecting" ||
    runStatus === "running" ||
    isStopping;

  const statusLabel =
    runStatus === "cancelled"
      ? "Stopped"
      : runStatus === "completed"
        ? "Completed"
        : runStatus === "failed"
          ? "Failed"
          : runStatus === "running"
            ? "Running"
            : runStatus === "connecting"
              ? "Connecting"
              : "Idle";

  return (
    <div className="flex max-h-56 min-h-40 flex-col border-t border-zinc-200 bg-zinc-950 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-zinc-200">Run logs</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              runStatus === "completed"
                ? "bg-emerald-500/15 text-emerald-300"
                : runStatus === "cancelled"
                  ? "bg-amber-500/15 text-amber-300"
                  : runStatus === "failed"
                    ? "bg-red-500/15 text-red-300"
                    : "bg-blue-500/15 text-blue-300"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        {canStop ? (
          <button
            type="button"
            onClick={onStop}
            disabled={isStopping || runStatus === "cancelled"}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-60"
          >
            {isStopping ? "Stopping…" : "Stop run"}
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs leading-5">
        {events.length === 0 ? (
          <p className="text-zinc-500">Waiting for workflow events…</p>
        ) : (
          events.map((event, index) => (
            <pre
              key={`${event.timestamp}-${index}`}
              className={`mb-2 whitespace-pre-wrap ${
                event.event === "cancelled" || event.level === "error"
                  ? "text-red-300"
                  : event.event === "complete"
                    ? "text-emerald-300"
                    : "text-zinc-300"
              }`}
            >
              {formatLogLine(event)}
            </pre>
          ))
        )}
      </div>
    </div>
  );
}
