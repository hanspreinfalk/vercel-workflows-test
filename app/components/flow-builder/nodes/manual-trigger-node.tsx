"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ManualTriggerIcon } from "@/app/components/icons/manual-trigger-icon";
import { FlowNodeFrame } from "./flow-node-frame";
import type { ManualTriggerNodeData } from "@/lib/flow/types";

type ManualTriggerNodeDataWithRun = ManualTriggerNodeData & {
  runStatus?: "started" | "completed" | "failed";
};

export function ManualTriggerFlowNode({ data, selected }: NodeProps) {
  const nodeData = data as ManualTriggerNodeDataWithRun;

  return (
    <FlowNodeFrame
      runStatus={nodeData.runStatus}
      selected={!!selected}
      accent="emerald"
      className="w-[220px]"
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <ManualTriggerIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {nodeData.label}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Start</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
            start flow
          </span>
        </div>
        {nodeData.runStatus === "started" ? (
          <p className="mt-2 text-xs text-[var(--brand)]">Running…</p>
        ) : null}
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-emerald-500"
        />
      </div>
    </FlowNodeFrame>
  );
}
