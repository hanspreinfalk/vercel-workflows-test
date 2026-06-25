import type { AgentNodeData, FlowNode } from "@/lib/flow/types";

export type AgentFlowNode = Extract<
  FlowNode,
  { type: "claude-code" | "open-code" }
>;

export function isAgentNode(node: FlowNode): node is AgentFlowNode {
  return node.type === "claude-code" || node.type === "open-code";
}

export function getAgentNodeCount(nodes: FlowNode[]) {
  return nodes.filter(isAgentNode).length;
}

export function getDefaultAgentLabel(nodes: FlowNode[]) {
  return `Agent ${getAgentNodeCount(nodes) + 1}`;
}

export type AgentNodeDataWithRun = AgentNodeData & {
  runStatus?: "started" | "completed" | "failed";
};
