"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { StopIcon } from "@/app/components/icons/stop-icon";
import { FlowNodeFrame } from "./flow-node-frame";
import type { StopNodeData } from "@/lib/flow/types";

type StopNodeDataWithRun = StopNodeData & {
  runStatus?: "started" | "completed" | "failed";
};

export function StopFlowNode({ data, selected }: NodeProps) {
  const nodeData = data as StopNodeDataWithRun;

  return (
    <FlowNodeFrame
      runStatus={nodeData.runStatus}
      selected={!!selected}
      accent="red"
      className="w-[220px]"
    >
      <div className="px-4 py-3">
        <Handle type="target" position={Position.Left} className="!bg-red-500" />
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
            <StopIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {nodeData.label}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Stop</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
            end flow
          </span>
        </div>
        {nodeData.runStatus === "started" ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">Stopping…</p>
        ) : null}
        {nodeData.runStatus === "completed" ? (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Stopped</p>
        ) : null}
      </div>
    </FlowNodeFrame>
  );
}
