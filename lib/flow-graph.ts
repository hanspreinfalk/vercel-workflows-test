import type { FlowEdge, FlowNode } from "@/lib/flow-types";
import { getNodeLabel } from "@/lib/flow-types";
import { isAgentNode } from "@/lib/agent-node-utils";

export function getExecutionOrder(
  nodes: FlowNode[],
  edges: FlowEdge[]
): string[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = [...nodeIds].filter((id) => (inDegree.get(id) ?? 0) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    for (const next of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
      }
    }
  }

  if (order.length !== nodeIds.size) {
    throw new Error(
      "Flow has a cycle or disconnected nodes. Use a linear or DAG layout."
    );
  }

  return order;
}

export function buildNodePrompt(
  prompt: string,
  nodeId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  outputs: Record<string, string>
) {
  const predecessors = edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);

  if (predecessors.length === 0) {
    return prompt;
  }

  const context = predecessors
    .map((sourceId) => {
      const sourceNode = nodes.find((node) => node.id === sourceId);
      const label = sourceNode ? getNodeLabel(sourceNode) : sourceId;
      return `## Output from "${label}"\n${outputs[sourceId] ?? "(no output)"}`;
    })
    .join("\n\n");

  return `${prompt.trim()}\n\n---\nContext from previous nodes:\n\n${context}`;
}

export function collectSecretsToRedact(nodes: FlowNode[]): string[] {
  const secrets: string[] = [];

  for (const node of nodes) {
    if (!isAgentNode(node)) {
      continue;
    }

    const values = Object.values(node.data.secrets);
    for (const value of values) {
      if (value && value.length >= 4) {
        secrets.push(value);
      }
    }
  }

  return [...new Set(secrets)];
}

export function hasManualTrigger(nodes: FlowNode[]): boolean {
  return nodes.some((node) => node.type === "manual-trigger");
}
