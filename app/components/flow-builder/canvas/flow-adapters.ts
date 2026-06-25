import type { Edge, Node } from "@xyflow/react";
import type { FlowEdge, FlowNode } from "@/lib/flow/types";

export function toReactFlowNodes(nodes: FlowNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));
}

export function toReactFlowEdges(edges: FlowEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
}

export function fromReactFlowNodes(nodes: Node[]): FlowNode[] {
  return nodes.map((node) => {
    if (node.type === "manual-trigger") {
      return {
        id: node.id,
        type: "manual-trigger",
        position: node.position,
        data: node.data as Extract<FlowNode, { type: "manual-trigger" }>["data"],
      };
    }

    if (node.type === "stop") {
      return {
        id: node.id,
        type: "stop",
        position: node.position,
        data: node.data as Extract<FlowNode, { type: "stop" }>["data"],
      };
    }

    if (node.type === "open-code") {
      return {
        id: node.id,
        type: "open-code",
        position: node.position,
        data: node.data as Extract<FlowNode, { type: "open-code" }>["data"],
      };
    }

    return {
      id: node.id,
      type: "claude-code",
      position: node.position,
      data: node.data as Extract<FlowNode, { type: "claude-code" }>["data"],
    };
  });
}

export function fromReactFlowEdges(edges: Edge[]): FlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
}

export const FIT_VIEW_OPTIONS = {
  padding: 0.4,
  maxZoom: 0.85,
};

export const DEFAULT_EDGE_OPTIONS = {
  style: { strokeWidth: 1.5 },
  type: "smoothstep" as const,
};
