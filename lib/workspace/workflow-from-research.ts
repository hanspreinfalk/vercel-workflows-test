import type { RecordingEvent } from "@/lib/workspace/types";
import type { Interview, Participant } from "@/lib/workspace/types";
import type { ScreenRecording } from "@/lib/workspace/types";
import {
  createDefaultClaudeNode,
  createManualTriggerNode,
  createStopNode,
  type FlowDefinition,
  type FlowEdge,
  type FlowNode,
} from "@/lib/flow/types";
import { saveFlow } from "@/lib/flow/store";

function summarizeRecordingSteps(events: RecordingEvent[]): string {
  return events
    .slice(0, 12)
    .map((event) => {
      switch (event.type) {
        case "screenshot":
          return `- Screenshot in ${event.appName}: ${event.windowTitle}`;
        case "click":
          return `- Click in ${event.appName}: ${event.target}`;
        case "app_switch":
          return `- Switch ${event.fromApp} → ${event.toApp}`;
        case "keystroke":
          return `- Typed in ${event.appName}: "${event.text}"`;
        case "shortcut":
          return `- Shortcut ${event.keys} in ${event.appName} (${event.action})`;
        case "scroll":
          return `- Scroll ${event.direction} in ${event.appName}`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}

export function buildResearchBootstrapMessage(params: {
  interview: Interview;
  recording: ScreenRecording | null;
  events: RecordingEvent[];
  participant: Participant | null;
}): string {
  const { interview, recording, events, participant } = params;
  const steps = summarizeRecordingSteps(events);
  const themes = interview.themes ?? [];

  return [
    `Build and run an automation workflow from research for ${participant?.name ?? "this participant"}.`,
    "",
    "## Interview findings",
    interview.summary,
    "",
    "Key themes: " + (themes.length > 0 ? themes.join(", ") : "None identified"),
    "",
    "## AI analysis",
    interview.analysisPreview.slice(0, 800),
    recording
      ? [
          "",
          "## Session recording",
          recording.title + " — " + recording.summary,
          "",
          "Observed steps:",
          steps || "(no events)",
        ].join("\n")
      : "",
    "",
    "Configure each agent with a skill (instructions + bash script), collect my Anthropic and GitHub tokens in the Credentials panel, then run the flow and self-improve until it works.",
  ].join("\n");
}

export function createFlowFromResearch(params: {
  interview: Interview;
  recording: ScreenRecording | null;
  events: RecordingEvent[];
  participant: Participant | null;
}): FlowDefinition {
  const { interview, recording, participant } = params;
  const themes = interview.themes ?? [];
  const flowName = `Automate: ${interview.title}`;

  const triggerId = crypto.randomUUID();
  const agent1Id = crypto.randomUUID();
  const agent2Id = crypto.randomUUID();
  const stopId = crypto.randomUUID();

  const trigger = createManualTriggerNode(triggerId, { x: 40, y: 140 }, "Start");
  trigger.data.payload = [
    `Interview: ${interview.title}`,
    `Participant: ${participant?.name ?? "Unknown"}`,
    recording ? `Recording: ${recording.title}` : "",
    "",
    interview.summary,
  ]
    .filter(Boolean)
    .join("\n");

  const agent1 = createDefaultClaudeNode(
    agent1Id,
    { x: 320, y: 100 },
    "Prepare context"
  );
  agent1.data.prompt =
    "Use the Start payload and recording observations to prepare the workspace and list the manual steps that should be automated.";
  agent1.data.skill = {
    name: "research-intake",
    description: "Ingest interview + recording context before automation.",
    instructions: `# Research intake

1. Read the Start node payload (interview summary and participant context)
2. List the manual steps observed in the session recording
3. Identify tools involved (CRM, spreadsheets, support desk, etc.)
4. Output a numbered automation plan for downstream agents`,
    script: `#!/usr/bin/env bash
set -euo pipefail
echo "=== Research intake ==="
echo "Loading interview context from workflow payload..."
mkdir -p ./automation-artifacts
echo "ready" > ./automation-artifacts/intake.status
`,
  };

  const agent2 = createDefaultClaudeNode(
    agent2Id,
    { x: 620, y: 140 },
    "Execute automation"
  );
  agent2.data.prompt =
    "Execute the automation plan from the previous agent. Implement or simulate the workflow steps and report results.";
  agent2.data.skill = {
    name: "workflow-executor",
    description: "Execute the planned automation steps.",
    instructions: `# Workflow executor

1. Read the upstream agent output with the automation plan
2. Execute each step in order
3. If GitHub access is required, use the cloned repository
4. Return a concise run report: what ran, what succeeded, what failed`,
    script: `#!/usr/bin/env bash
set -euo pipefail
echo "=== Workflow executor ==="
if [ -f ./automation-artifacts/intake.status ]; then
  echo "Intake complete — proceeding with automation steps"
else
  echo "Warning: intake artifact missing" >&2
fi
`,
  };

  if (themes.some((t) => /github|ci|deploy/i.test(t))) {
    agent2.data.permissions = ["github"];
  }

  const stop = createStopNode(stopId, { x: 920, y: 140 }, "Done");

  const nodes: FlowNode[] = [trigger, agent1, agent2, stop];
  const edges: FlowEdge[] = [
    { id: crypto.randomUUID(), source: triggerId, target: agent1Id },
    { id: crypto.randomUUID(), source: agent1Id, target: agent2Id },
    { id: crypto.randomUUID(), source: agent2Id, target: stopId },
  ];

  return saveFlow({
    name: flowName,
    nodes,
    edges,
    sourceInterviewId: interview.id,
    sourceRecordingId: recording?.id,
  });
}
