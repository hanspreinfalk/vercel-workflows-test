export type FlowRunControl = {
  cancelled: boolean;
  sandboxNames: Set<string>;
  agentNodeIds: string[];
};

const globalForFlowRuns = globalThis as typeof globalThis & {
  __flowRunControls?: Map<string, FlowRunControl>;
};

const controls: Map<string, FlowRunControl> =
  globalForFlowRuns.__flowRunControls ?? new Map();

globalForFlowRuns.__flowRunControls = controls;

function getControl(runId: string): FlowRunControl {
  let control = controls.get(runId);
  if (!control) {
    control = { cancelled: false, sandboxNames: new Set(), agentNodeIds: [] };
    controls.set(runId, control);
  }
  return control;
}

export function getFlowRunControl(runId: string) {
  return getControl(runId);
}

export function getFlowSandboxName(runId: string, nodeId: string) {
  return `flow-${runId.slice(0, 12)}-${nodeId.slice(0, 12)}`;
}

export function registerFlowRun(runId: string, agentNodeIds: string[] = []) {
  controls.set(runId, {
    cancelled: false,
    sandboxNames: new Set(),
    agentNodeIds,
  });
}

export function registerFlowRunSandbox(runId: string, sandboxName: string) {
  getControl(runId).sandboxNames.add(sandboxName);
}

export function isFlowRunCancelled(runId: string): boolean {
  return getControl(runId).cancelled;
}

export function markFlowRunCancelled(runId: string) {
  getControl(runId).cancelled = true;
}

export function clearFlowRun(runId: string) {
  controls.delete(runId);
}

export function getSandboxNamesToStop(runId: string) {
  const control = getControl(runId);
  const names = new Set<string>(control.sandboxNames);

  for (const nodeId of control.agentNodeIds) {
    names.add(getFlowSandboxName(runId, nodeId));
  }

  return [...names];
}
