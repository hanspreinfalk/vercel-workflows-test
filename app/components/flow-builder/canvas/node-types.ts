import { ClaudeCodeFlowNode } from "../nodes/claude-code-node";
import { ManualTriggerFlowNode } from "../nodes/manual-trigger-node";
import { OpenCodeFlowNode } from "../nodes/open-code-node";
import { StopFlowNode } from "../nodes/stop-node";

export const flowNodeTypes = {
  "claude-code": ClaudeCodeFlowNode,
  "open-code": OpenCodeFlowNode,
  "manual-trigger": ManualTriggerFlowNode,
  stop: StopFlowNode,
};
