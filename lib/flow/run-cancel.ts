import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Sandbox } from "@vercel/sandbox";
import {
  getFlowRunControl,
  getFlowSandboxName,
  getSandboxNamesToStop,
  markFlowRunCancelled,
  registerFlowRun,
  type FlowRunControl,
} from "@/lib/flow/run-state";

const REGISTRY_DIR = path.join(os.tmpdir(), "my-workflow-app-flow-runs");

type PersistedRunRegistry = {
  sandboxNames: string[];
  agentNodeIds: string[];
};

function registryPath(runId: string) {
  return path.join(REGISTRY_DIR, `${runId}.json`);
}

function readPersistedRegistry(runId: string): PersistedRunRegistry {
  try {
    const raw = fs.readFileSync(registryPath(runId), "utf8");
    const parsed = JSON.parse(raw) as PersistedRunRegistry;
    return {
      sandboxNames: Array.isArray(parsed.sandboxNames) ? parsed.sandboxNames : [],
      agentNodeIds: Array.isArray(parsed.agentNodeIds) ? parsed.agentNodeIds : [],
    };
  } catch {
    return { sandboxNames: [], agentNodeIds: [] };
  }
}

function writePersistedRegistry(runId: string, control: FlowRunControl) {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  const payload: PersistedRunRegistry = {
    sandboxNames: [...control.sandboxNames],
    agentNodeIds: control.agentNodeIds,
  };
  fs.writeFileSync(registryPath(runId), JSON.stringify(payload));
}

export function registerFlowRunWithPersistence(
  runId: string,
  agentNodeIds: string[] = []
) {
  registerFlowRun(runId, agentNodeIds);
  writePersistedRegistry(runId, getFlowRunControl(runId));
}

export function registerFlowRunSandboxWithPersistence(
  runId: string,
  sandboxName: string
) {
  getFlowRunControl(runId).sandboxNames.add(sandboxName);
  writePersistedRegistry(runId, getFlowRunControl(runId));
}

async function stopSandboxByName(name: string) {
  try {
    const sandbox = await Sandbox.get({ name });
    await sandbox.stop();
  } catch {
    // Sandbox may already be stopped or never created.
  }
}

export async function cancelFlowRun(runId: string) {
  const persisted = readPersistedRegistry(runId);
  const control = getFlowRunControl(runId);

  if (control.agentNodeIds.length === 0 && persisted.agentNodeIds.length > 0) {
    control.agentNodeIds = persisted.agentNodeIds;
  }

  for (const name of persisted.sandboxNames) {
    control.sandboxNames.add(name);
  }

  markFlowRunCancelled(runId);

  const namesToStop = new Set([
    ...getSandboxNamesToStop(runId),
    ...persisted.sandboxNames,
    ...persisted.agentNodeIds.map((nodeId) =>
      getFlowSandboxName(runId, nodeId)
    ),
  ]);

  await Promise.all([...namesToStop].map((name) => stopSandboxByName(name)));

  clearFlowRunPersistence(runId);
}

export function clearFlowRunPersistence(runId: string) {
  try {
    fs.unlinkSync(registryPath(runId));
  } catch {
    // Registry file may already be removed.
  }
}
