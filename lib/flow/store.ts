import { normalizeFlowNodes } from "@/lib/agent/skills";
import {
  createDefaultFlow,
  type FlowDefinition,
  type FlowEdge,
  type FlowNode,
} from "@/lib/flow/types";

type FlowStore = {
  flows: Map<string, FlowDefinition>;
  order: string[];
};

const MAX_FLOWS = 50;

const globalForFlows = globalThis as typeof globalThis & {
  __flowStore?: FlowStore;
};

const store: FlowStore =
  globalForFlows.__flowStore ?? {
    flows: new Map<string, FlowDefinition>(),
    order: [],
  };

globalForFlows.__flowStore = store;

function enforceLimit() {
  while (store.order.length > MAX_FLOWS) {
    const oldest = store.order.shift();
    if (oldest) {
      store.flows.delete(oldest);
    }
  }
}

export function listFlows(): FlowDefinition[] {
  return store.order
    .map((id) => store.flows.get(id))
    .filter((flow): flow is FlowDefinition => flow !== undefined);
}

export function getFlow(flowId: string): FlowDefinition | null {
  const flow = store.flows.get(flowId);
  if (!flow) {
    return null;
  }

  return {
    ...flow,
    nodes: normalizeFlowNodes(flow.nodes),
  };
}

export function saveFlow(input: {
  id?: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  sourceInterviewId?: string;
  sourceRecordingId?: string;
}): FlowDefinition {
  const existing = input.id ? store.flows.get(input.id) : undefined;
  const now = Date.now();

  const flow: FlowDefinition = {
    id: input.id ?? crypto.randomUUID(),
    name: input.name.trim() || "Untitled flow",
    nodes: normalizeFlowNodes(input.nodes),
    edges: input.edges,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sourceInterviewId: input.sourceInterviewId ?? existing?.sourceInterviewId,
    sourceRecordingId: input.sourceRecordingId ?? existing?.sourceRecordingId,
  };

  store.flows.set(flow.id, flow);

  if (!store.order.includes(flow.id)) {
    store.order.unshift(flow.id);
  }

  enforceLimit();
  return flow;
}

export function createFlow(name?: string): FlowDefinition {
  return saveFlow(createDefaultFlow(name));
}

export function deleteFlow(flowId: string) {
  store.flows.delete(flowId);
  store.order = store.order.filter((id) => id !== flowId);
}
