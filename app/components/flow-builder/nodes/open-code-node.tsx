"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { OpenCodeIcon } from "@/app/components/icons/open-code-icon";
import {
  AgentNodeBadges,
  AgentNodeRunStatus,
} from "./agent-node-badges";
import { FlowNodeFrame } from "./flow-node-frame";
import type { AgentNodeDataWithRun } from "@/lib/agent/node-utils";

export function OpenCodeFlowNode({ data, selected }: NodeProps) {
  const nodeData = data as AgentNodeDataWithRun;

  return (
    <FlowNodeFrame
      runStatus={nodeData.runStatus}
      selected={!!selected}
      accent="violet"
      className="min-w-[220px]"
    >
      <div className="px-4 py-3">
        <Handle type="target" position={Position.Left} className="!bg-sky-500" />
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-500/10">
            <OpenCodeIcon className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {nodeData.label}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">OpenCode</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <AgentNodeBadges permissions={nodeData.permissions} skill={nodeData.skill} />
        </div>
        <AgentNodeRunStatus runStatus={nodeData.runStatus} />
        <Handle type="source" position={Position.Right} className="!bg-sky-500" />
      </div>
    </FlowNodeFrame>
  );
}
