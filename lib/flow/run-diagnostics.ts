import {
  parseBuiltFlowProgressEvent,
  type BuiltFlowProgressEvent,
} from "@/lib/flow/progress";

export type FlowRunNodeState = {
  label: string;
  status: "started" | "completed" | "failed";
  message?: string;
  output?: string;
};

export type FlowRunDiagnostics = {
  runId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  events: BuiltFlowProgressEvent[];
  nodeStates: Record<string, FlowRunNodeState>;
  results: Record<string, string> | null;
  error: string | null;
};

export type FlowRunContext = {
  runId: string;
  status: string;
  error?: string | null;
  events?: BuiltFlowProgressEvent[];
  nodeOutputs?: Record<string, FlowRunNodeState>;
  results?: Record<string, string> | null;
};

const MAX_OUTPUT_CHARS = 4_000;
const MAX_LOG_EVENTS = 80;
const RUN_POLL_MS = 1_500;
const RUN_TIMEOUT_MS = 600_000;

function truncate(text: string, max = MAX_OUTPUT_CHARS) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}\n… [truncated ${text.length - max} chars]`;
}

function applyProgressEvent(
  event: BuiltFlowProgressEvent,
  state: {
    nodeStates: Record<string, FlowRunNodeState>;
    results: Record<string, string> | null;
    status: FlowRunDiagnostics["status"];
    error: string | null;
  }
) {
  if (event.event === "cancelled") {
    state.status = "cancelled";
    return;
  }

  if (event.event === "node" && event.nodeId && event.status) {
    state.nodeStates[event.nodeId] = {
      label: event.label ?? event.nodeId,
      status: event.status,
      message: event.message,
      output: event.output,
    };

    if (event.status === "failed") {
      state.status = "failed";
      state.error = event.message ?? "Node execution failed";
    }
  }

  if (event.event === "complete") {
    state.results = event.results ?? null;
    state.status = "completed";
  }

  if (event.event === "log" && event.level === "error") {
    state.error = event.message;
  }
}

export async function waitForFlowRunCompletion(
  runId: string
): Promise<FlowRunDiagnostics> {
  const events: BuiltFlowProgressEvent[] = [];
  const nodeStates: Record<string, FlowRunNodeState> = {};
  const state = {
    nodeStates,
    results: null as Record<string, string> | null,
    status: "running" as FlowRunDiagnostics["status"],
    error: null as string | null,
  };
  const startedAt = Date.now();

  const ingestEvent = (event: BuiltFlowProgressEvent) => {
    events.push(event);
    applyProgressEvent(event, state);
  };

  try {
    const response = await fetch(`/api/builder/runs/${runId}/stream`);
    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (Date.now() - startedAt < RUN_TIMEOUT_MS) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = parseBuiltFlowProgressEvent(line);
          if (!event) continue;
          ingestEvent(event);
        }
      }
    }
  } catch (streamError) {
    state.error =
      streamError instanceof Error
        ? streamError.message
        : "Could not stream run logs";
  }

  while (
    state.status === "running" &&
    Date.now() - startedAt < RUN_TIMEOUT_MS
  ) {
    await new Promise((resolve) => setTimeout(resolve, RUN_POLL_MS));

    try {
      const response = await fetch(`/api/builder/runs/${runId}/status`);
      if (!response.ok) continue;

      const data = (await response.json()) as {
        status?: string;
        result?: Record<string, string>;
      };

      if (data.status === "completed") {
        state.status = "completed";
        state.results = data.result ?? state.results;
        break;
      }

      if (data.status === "failed") {
        state.status = "failed";
        state.error = state.error ?? "Workflow run failed";
        break;
      }

      if (data.status === "cancelled") {
        state.status = "cancelled";
        break;
      }
    } catch {
      // Keep polling until timeout.
    }
  }

  if (state.status === "running" && Date.now() - startedAt >= RUN_TIMEOUT_MS) {
    state.status = "failed";
    state.error = state.error ?? "Timed out waiting for workflow run";
  }

  return {
    runId,
    status: state.status,
    events,
    nodeStates: state.nodeStates,
    results: state.results,
    error: state.error,
  };
}

export function summarizeRunDiagnostics(
  diagnostics: FlowRunDiagnostics
): string[] {
  const lines = [`Run ${diagnostics.runId.slice(0, 8)}… → ${diagnostics.status}`];

  if (diagnostics.error) {
    lines.push(`Error: ${diagnostics.error}`);
  }

  for (const [nodeId, node] of Object.entries(diagnostics.nodeStates)) {
    const outputPreview = node.output?.trim();
    if (node.status === "failed") {
      lines.push(`${node.label} (${nodeId}): failed — ${node.message ?? "unknown"}`);
    } else if (node.status === "completed") {
      lines.push(
        `${node.label} (${nodeId}): completed${
          outputPreview
            ? ` (${outputPreview.length} chars output)`
            : " (no output)"
        }`
      );
    }
  }

  if (diagnostics.results && Object.keys(diagnostics.results).length > 0) {
    lines.push(`Final results for ${Object.keys(diagnostics.results).length} node(s)`);
  }

  return lines;
}

export function formatRunDiagnosticsForChat(
  diagnostics: FlowRunDiagnostics
): string {
  const recentEvents = diagnostics.events.slice(-MAX_LOG_EVENTS);
  const logLines = recentEvents.map((event) => {
    const prefix =
      event.event === "log"
        ? `[log${event.level ? `:${event.level}` : ""}]`
        : event.event === "node"
          ? `[node:${event.nodeId}:${event.status ?? "?"}]`
          : `[${event.event}]`;
    return `${prefix} ${event.message}`;
  });

  const nodeSections = Object.entries(diagnostics.nodeStates).map(
    ([nodeId, node]) => {
      const parts = [
        `### ${node.label} (${nodeId})`,
        `Status: ${node.status}`,
      ];

      if (node.message) {
        parts.push(`Message: ${node.message}`);
      }

      if (node.output?.trim()) {
        parts.push(`Output:\n${truncate(node.output.trim())}`);
      } else if (node.status === "completed") {
        parts.push("Output: (empty)");
      }

      return parts.join("\n");
    }
  );

  const resultSection =
    diagnostics.results && Object.keys(diagnostics.results).length > 0
      ? [
          "## Final node results",
          ...Object.entries(diagnostics.results).map(
            ([nodeId, output]) =>
              `### ${nodeId}\n${truncate(output.trim() || "(empty)")}`
          ),
        ].join("\n\n")
      : "";

  return [
    `Run ID: ${diagnostics.runId}`,
    `Status: ${diagnostics.status}`,
    diagnostics.error ? `Error: ${diagnostics.error}` : null,
    "## Execution log",
    logLines.length > 0 ? logLines.join("\n") : "(no log events captured)",
    nodeSections.length > 0 ? "## Node execution\n" + nodeSections.join("\n\n") : null,
    resultSection || null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildRunContinuationPrompt(
  diagnostics: FlowRunDiagnostics,
  mode: "fix" | "verify"
): string {
  const formatted = formatRunDiagnosticsForChat(diagnostics);

  if (mode === "fix") {
    return `[Workflow run finished with status: ${diagnostics.status}]

${formatted}

The run failed or produced bad output. Read the logs and node outputs above, diagnose the root cause, and fix the workflow using apply_flow_actions (update prompts, skills, permissions, Start payload, edges, node types, etc.). Then set runFlow: true to test again.`;
  }

  return `[Workflow run finished with status: ${diagnostics.status}]

${formatted}

Review the logs and node outputs above. Decide whether the run succeeded with good quality output. If output is empty, wrong, or incomplete, fix the workflow and run again with runFlow: true. If the result looks good, confirm success briefly and do not run again.`;
}

export function shouldContinueSelfImprovement(params: {
  enabled: boolean;
  diagnostics: FlowRunDiagnostics;
  improveTurn: number;
  maxTurns: number;
}): boolean {
  if (!params.enabled || params.improveTurn >= params.maxTurns) {
    return false;
  }

  if (
    params.diagnostics.status === "failed" ||
    params.diagnostics.status === "cancelled"
  ) {
    return true;
  }

  if (params.diagnostics.status === "completed" && params.improveTurn === 0) {
    return true;
  }

  return false;
}

export function selfImprovementUserLabel(
  diagnostics: FlowRunDiagnostics,
  mode: "fix" | "verify"
): string {
  if (mode === "fix") {
    return `Run ${diagnostics.status}. Analyzing logs and fixing the workflow…`;
  }
  return "Run completed. Verifying output quality…";
}
