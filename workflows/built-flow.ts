import { FatalError, getWritable, getWorkflowMetadata } from "workflow";
import { getSkillDisplayName } from "@/lib/agent/skills";
import type { AgentFlowNode } from "@/lib/agent/node-utils";
import { isAgentNode } from "@/lib/agent/node-utils";
import {
  buildNodePrompt,
  collectSecretsToRedact,
  getExecutionOrder,
} from "@/lib/flow/graph";
import { clearFlowRun, isFlowRunCancelled } from "@/lib/flow/run-state";
import { getNodeLabel, type FlowNode, type FlowRunSnapshot } from "@/lib/flow/types";
import { runAgentNode } from "@/lib/agent/run-node";
import type { BuiltFlowProgressEvent } from "@/lib/flow/progress";

async function emitProgress(event: Omit<BuiltFlowProgressEvent, "timestamp">) {
  const writer = getWritable<string>().getWriter();
  await writer.write(
    JSON.stringify({ ...event, timestamp: Date.now() }) + "\n"
  );
  writer.releaseLock();
}

async function emitLog(
  message: string,
  level: BuiltFlowProgressEvent["level"] = "info"
) {
  "use step";
  await emitProgress({ event: "log", level, message });
}

async function ensureFlowRunActive(runId: string) {
  "use step";

  if (!isFlowRunCancelled(runId)) {
    return;
  }

  await emitProgress({
    event: "cancelled",
    status: "failed",
    message: "Run stopped by user",
  });
  clearFlowRun(runId);
  throw new FatalError("Run cancelled by user");
}

function getAgentRuntimeLabel(node: AgentFlowNode) {
  return node.type === "open-code" ? "OpenCode" : "Claude Code";
}

export async function executeBuiltFlow(snapshot: FlowRunSnapshot) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  const order = getExecutionOrder(snapshot.nodes, snapshot.edges);
  const outputs: Record<string, string> = {};
  const secretsToRedact = collectSecretsToRedact(snapshot.nodes);

  await emitLog(`Starting flow "${snapshot.flowName}" (${order.length} nodes)`);

  for (const nodeId of order) {
    await ensureFlowRunActive(workflowRunId);

    const node = snapshot.nodes.find((item) => item.id === nodeId);
    if (!node) {
      throw new FatalError(`Missing node ${nodeId}`);
    }

    if (node.type === "manual-trigger") {
      outputs[nodeId] = await runManualTriggerStep(node);
      continue;
    }

    if (node.type === "stop") {
      outputs[nodeId] = await runStopStep(node);
      await markFlowComplete(outputs, "Flow stopped at stop node");
      clearFlowRun(workflowRunId);
      return outputs;
    }

    if (isAgentNode(node)) {
      outputs[nodeId] = await runAgentNodeStep({
        runId: workflowRunId,
        node,
        snapshot,
        priorOutputs: { ...outputs },
        secretsToRedact,
      });
    }
  }

  await markFlowComplete(outputs);
  clearFlowRun(workflowRunId);

  return outputs;
}

async function markFlowComplete(
  results: Record<string, string>,
  message = "Flow finished"
) {
  "use step";
  await emitLog(message === "Flow finished" ? "Flow finished successfully" : message);
  await emitProgress({
    event: "complete",
    status: "completed",
    message,
    results,
  });
}

async function runStopStep(node: Extract<FlowNode, { type: "stop" }>) {
  "use step";

  const output = "Workflow stopped at stop node.";

  await emitProgress({
    event: "node",
    nodeId: node.id,
    label: node.data.label,
    status: "started",
    message: "Stop node reached",
  });

  await emitLog(`Stop node "${node.data.label}" reached — ending workflow`);

  await emitProgress({
    event: "node",
    nodeId: node.id,
    label: node.data.label,
    status: "completed",
    message: "Workflow stopped",
    output,
  });

  return output;
}

async function runManualTriggerStep(node: Extract<FlowNode, { type: "manual-trigger" }>) {
  "use step";

  const output =
    node.data.payload.trim() ||
    "Start fired. No payload was configured.";

  await emitProgress({
    event: "node",
    nodeId: node.id,
    label: node.data.label,
    status: "started",
    message: "Start node activated",
  });

  await emitLog(`Start node "${node.data.label}" activated`);

  await emitProgress({
    event: "node",
    nodeId: node.id,
    label: node.data.label,
    status: "completed",
    message: "Start node completed",
    output,
  });

  return output;
}

async function runAgentNodeStep(params: {
  runId: string;
  node: AgentFlowNode;
  snapshot: FlowRunSnapshot;
  priorOutputs: Record<string, string>;
  secretsToRedact: string[];
}) {
  "use step";

  const { node, snapshot, priorOutputs, runId, secretsToRedact } = params;
  const runtimeLabel = getAgentRuntimeLabel(node);
  const skillLabel = getSkillDisplayName(node.data.skill);

  await emitProgress({
    event: "node",
    nodeId: node.id,
    label: getNodeLabel(node),
    status: "started",
    message: `Running ${node.data.label} (${runtimeLabel}${skillLabel ? `, skill:${skillLabel}` : ""}, ${node.data.permissions.join(", ") || "base sandbox"})`,
  });

  await emitLog(
    `Running ${node.data.label} with ${runtimeLabel}${skillLabel ? ` (skill: ${skillLabel})` : ""} (${node.data.permissions.join(", ") || "base sandbox"})`
  );

  try {
    const prompt = buildNodePrompt(
      node.data.prompt,
      node.id,
      snapshot.nodes,
      snapshot.edges,
      priorOutputs
    );

    const output = await runAgentNode({
      node,
      prompt,
      runId,
      secretsToRedact,
    });

    await emitLog(`${node.data.label} completed`);
    await emitProgress({
      event: "node",
      nodeId: node.id,
      label: node.data.label,
      status: "completed",
      message: `${node.data.label} finished`,
      output,
    });

    return output;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Node execution failed";

    await emitLog(`${node.data.label} failed: ${message}`, "error");
    await emitProgress({
      event: "node",
      nodeId: node.id,
      label: node.data.label,
      status: "failed",
      message,
    });

    throw error;
  }
}
