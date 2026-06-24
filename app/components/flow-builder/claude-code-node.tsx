"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ClaudeCodeIcon } from "@/app/components/icons/claude-code-icon";
import {
  AgentNodeBadges,
  AgentNodeRunStatus,
} from "./agent-node-badges";
import { FlowNodeFrame } from "./flow-node-frame";
import type { AgentNodeDataWithRun } from "@/lib/agent-node-utils";

export function ClaudeCodeFlowNode({ data, selected }: NodeProps) {
  const nodeData = data as AgentNodeDataWithRun;

  return (
    <FlowNodeFrame
      runStatus={nodeData.runStatus}
      selected={!!selected}
      accent="violet"
      className="min-w-[220px]"
    >
      <div className="px-4 py-3">
        <Handle type="target" position={Position.Left} className="!bg-violet-500" />
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#C15F3C]/10">
            <ClaudeCodeIcon className="h-4 w-4 text-[#C15F3C]" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {nodeData.label}
            </p>
            <p className="text-xs text-zinc-500">Claude Code</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <AgentNodeBadges permissions={nodeData.permissions} skill={nodeData.skill} />
        </div>
        <AgentNodeRunStatus runStatus={nodeData.runStatus} />
        <Handle type="source" position={Position.Right} className="!bg-violet-500" />
      </div>
    </FlowNodeFrame>
  );
}
