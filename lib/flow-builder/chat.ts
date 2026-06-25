import { getDefaultAgentLabel, isAgentNode } from "@/lib/agent/node-utils";
import {
  formatMissingRequirementsForChat,
  getMissingFlowRequirements,
} from "@/lib/flow/credentials";
import {
  inferFlowActionsFromUserMessage,
  isActionsEmpty,
  isCreateOrBuildRequest,
  isEndToEndBuildRequest,
} from "@/lib/flow-builder/intents";
import { formatRunDiagnosticsForChat, type FlowRunContext } from "@/lib/flow/run-diagnostics";
import { getSkillDisplayName, normalizeAgentSkill } from "@/lib/agent/skills";
import type { AgentSkill, ClaudeNodeSecrets, FlowEdge, FlowNode, NodePermission } from "@/lib/flow/types";
import {
  createDefaultClaudeNode,
  createDefaultOpenCodeNode,
  createManualTriggerNode,
  createStopNode,
  getNodeLabel,
} from "@/lib/flow/types";

export type FlowBuilderChatRole = "user" | "assistant";

export type FlowBuilderChatSegment =
  | { type: "text"; content: string }
  | { type: "actions"; summary: string[] }
  | { type: "run_report"; status: string; summary: string[] };

export type FlowBuilderChatMessage = {
  role: FlowBuilderChatRole;
  content: string;
  /** Ordered assistant output: text and applied canvas actions as they streamed. */
  segments?: FlowBuilderChatSegment[];
};

export type FlowBuilderChatStreamEvent =
  | { type: "text_start" }
  | { type: "token"; token: string }
  | { type: "text_end" }
  | { type: "actions"; actions: FlowBuilderActions }
  | { type: "done"; content: string; actions: FlowBuilderActions }
  | { type: "error"; message: string };

export type FlowBuilderChatContext = {
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId?: string | null;
  activeRunId?: string | null;
  runStatus?: string | null;
  isRunning?: boolean;
  lastRun?: FlowRunContext | null;
};

export type FlowNodePosition = {
  x: number;
  y: number;
};

export type NodeFieldUpdate = {
  nodeId?: string;
  label?: string;
  prompt?: string;
  payload?: string;
  skill?: Partial<AgentSkill>;
  permissions?: NodePermission[];
  secrets?: Partial<ClaudeNodeSecrets>;
  /** Canvas coordinates (React Flow position). */
  position?: FlowNodePosition;
};

export type AddFlowNodeAction = {
  id?: string;
  type: FlowNode["type"];
  label?: string;
  prompt?: string;
  payload?: string;
  skill?: Partial<AgentSkill>;
  permissions?: NodePermission[];
  position?: FlowNodePosition;
  /** Auto-connect an edge from this node id to the new node. */
  connectFrom?: string;
};

export type FlowBuilderActions = {
  name?: string;
  addNodes?: AddFlowNodeAction[];
  removeNodeIds?: string[];
  addEdges?: Array<{ id?: string; source: string; target: string }>;
  removeEdgeIds?: string[];
  updates?: NodeFieldUpdate[];
  runFlow?: boolean;
  stopFlow?: boolean;
  selectNodeId?: string | null;
};

export type FlowBuilderActionsPayload = {
  actions?: FlowBuilderActions;
  /** Legacy format */
  updates?: NodeFieldUpdate[];
};

export type AppliedFlowActionsResult = {
  flowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  runFlow: boolean;
  stopFlow: boolean;
  summary: string[];
};

const SYSTEM_PROMPT = `You are a flow builder copilot embedded in a visual workflow editor. You apply changes directly to the canvas — never tell the user to manually click nodes, edit the inspector, or press Run unless a tool call failed.

## Flow building blocks
- **manual-trigger** (Start) — entry point; optional payload (e.g. a GitHub repo URL)
- **claude-code** — runs Claude Code in an isolated sandbox
- **open-code** — runs OpenCode in an isolated sandbox
- **stop** — ends the workflow when reached; downstream nodes are skipped

Each agent node has: label, **skill** (repeatable workflow with **instructions** + executable **script** bash file), **prompt** (one-off task), optional **permissions** ["github"], and **secrets** (Anthropic API key; GitHub token + repo URL when github permission is on).

## REQUIRED: credentials before run
- Runs are **blocked** until every agent has: skill name + instructions + script, a concrete prompt, Anthropic API key, and GitHub credentials when github permission is enabled.
- Context includes **missingCredentials** — when non-empty, do NOT set runFlow: true.
- Ask the user for each missing token clearly. Tell them to paste values in the **Credentials** panel (never echo secrets back in chat).
- After the user confirms credentials are filled, verify missingCredentials is empty before running.

## REQUIRED: skill + script for every agent
Every agent node MUST have:
1. **skill.name** — URL-safe id (e.g. crm-export)
2. **skill.instructions** — markdown steps the agent follows
3. **skill.script** — bash script that runs before the agent (setup, env checks, data prep). Example:
   \`\`\`bash
   #!/usr/bin/env bash
   set -euo pipefail
   echo "Preparing workspace..."
   \`\`\`

## REQUIRED: use the apply_flow_actions tool
Whenever the user asks to create, build, configure, connect, run, or stop anything on the canvas, you MUST call **apply_flow_actions** with the full change set.

Do NOT only describe what you would do. Do NOT put JSON in markdown fences — use the tool only.

### Examples of when to call the tool
- "Create an agent that summarizes a GitHub repo" → remove extra placeholder agents, configure trigger + one agent with github permission, repo-summary skill, wired edge
- "Add an OpenCode node for CI fixes" → addNodes with connectFrom
- "Run the flow" → runFlow: true
- "Stop" → stopFlow: true
- "Move Agent 1 to the right" → updates with nodeId + position { x, y }
- "Build a flow from start to finish" → configure the flow, runFlow: true, then read run logs in context and fix if needed

### Run logs, testing, and self-improvement
- Context includes **lastRun** with execution logs, per-node status, outputs, errors, and final results
- When the user asks to build from start to finish, test, debug, or self-improve: configure the flow with skills+scripts → ensure credentials are collected → **runFlow: true** → analyze lastRun → fix prompts/skills/scripts/permissions/payload/wiring → run again until output is good
- Read node outputs carefully. Empty output, stack traces, or irrelevant content means the workflow needs fixes
- Common fixes: add **github** permission, set Start **payload** (repo URL), improve **skill.instructions**, clarify **prompt**, add missing **edges**, swap agent type

### Layout (node coordinates)
- Every node in the snapshot has **position**: { x, y } (React Flow canvas coordinates)
- Move existing nodes via **updates**: { "nodeId": "node-1", "position": { "x": 320, "y": 120 } }
- Place new nodes via **addNodes** with a **position** field
- Typical left-to-right layout: Start ~{ x: 40, y: 140 }, agents ~{ x: 300–900, y: 120 }, Stop ~{ x: 900, y: 140 }
- When arranging multiple nodes, update all affected positions in one tool call

### Building flows from scratch or retargeting defaults
Default flows start with only a Start node. For a single-purpose flow:
1. **addNodes** for agents (or **updates** if reusing existing nodes)
2. **addEdges** / **connectFrom** to wire the trigger to agents

### Skill + prompt + script
- **skill.instructions** — repeatable steps (use plain text with newlines, not nested markdown code blocks)
- **skill.script** — bash script executed in sandbox before the agent runs
- **prompt** — specific task for this run

Keep your visible reply short: confirm what you created on the canvas.`;

function defaultNodePosition(type: FlowNode["type"], index: number) {
  if (type === "manual-trigger") {
    return { x: 40, y: 140 };
  }

  if (type === "stop") {
    return { x: 840 + index * 120, y: 160 };
  }

  return { x: 280 + index * 280, y: 120 + (index % 2) * 60 };
}

function createNodeFromAction(
  action: AddFlowNodeAction,
  existingNodes: FlowNode[]
): FlowNode {
  const id = action.id?.trim() || crypto.randomUUID();
  const agentCount = existingNodes.filter(isAgentNode).length;
  const position = action.position ?? defaultNodePosition(action.type, agentCount);

  if (action.type === "manual-trigger") {
    const node = createManualTriggerNode(
      id,
      position,
      action.label ?? "Start"
    );
    if (action.payload !== undefined) {
      return {
        ...node,
        data: { ...node.data, payload: action.payload },
      };
    }
    return node;
  }

  if (action.type === "stop") {
    const label = action.label?.trim() || "Stop";
    return createStopNode(id, position, label);
  }

  const label =
    action.label?.trim() ||
    getDefaultAgentLabel(existingNodes.filter(isAgentNode));

  if (action.type === "open-code") {
    const base = createDefaultOpenCodeNode(id, position, label);
    const data = {
      ...base.data,
      ...(action.prompt !== undefined ? { prompt: action.prompt } : {}),
      ...(action.skill !== undefined
        ? {
            skill: normalizeAgentSkill({
              ...base.data.skill,
              ...action.skill,
            }),
          }
        : {}),
      ...(action.permissions !== undefined
        ? { permissions: action.permissions }
        : {}),
    };
    return { ...base, data };
  }

  const base = createDefaultClaudeNode(id, position, label);
  const data = {
    ...base.data,
    ...(action.prompt !== undefined ? { prompt: action.prompt } : {}),
    ...(action.skill !== undefined
      ? {
          skill: normalizeAgentSkill({
            ...base.data.skill,
            ...action.skill,
          }),
        }
      : {}),
    ...(action.permissions !== undefined
      ? { permissions: action.permissions }
      : {}),
  };
  return { ...base, data };
}

function findNodeUpdate(
  node: FlowNode,
  updates: NodeFieldUpdate[]
): NodeFieldUpdate | undefined {
  return updates.find(
    (item) =>
      (item.nodeId && item.nodeId === node.id) ||
      (item.label &&
        getNodeLabel(node).trim().toLowerCase() ===
          item.label.trim().toLowerCase())
  );
}

function applyNodeUpdate(node: FlowNode, update: NodeFieldUpdate): FlowNode {
  const withPosition =
    update.position !== undefined
      ? { ...node, position: update.position }
      : node;

  if (withPosition.type === "manual-trigger") {
    return {
      ...withPosition,
      data: {
        ...withPosition.data,
        ...(update.label !== undefined ? { label: update.label } : {}),
        ...(update.payload !== undefined ? { payload: update.payload } : {}),
      },
    };
  }

  if (withPosition.type === "stop") {
    return {
      ...withPosition,
      data: {
        ...withPosition.data,
        ...(update.label !== undefined ? { label: update.label } : {}),
      },
    };
  }

  if (!isAgentNode(withPosition)) {
    return withPosition;
  }

  return {
    ...withPosition,
    data: {
      ...withPosition.data,
      ...(update.label !== undefined ? { label: update.label } : {}),
      ...(update.prompt !== undefined ? { prompt: update.prompt } : {}),
      ...(update.permissions !== undefined
        ? { permissions: update.permissions }
        : {}),
      ...(update.skill !== undefined
        ? {
            skill: normalizeAgentSkill({
              ...withPosition.data.skill,
              ...update.skill,
            }),
          }
        : {}),
      ...(update.secrets !== undefined
        ? {
            secrets: {
              ...withPosition.data.secrets,
              ...update.secrets,
            },
          }
        : {}),
    },
  };
}

export function sanitizeFlowForChat(flow: FlowBuilderChatContext) {
  return {
    name: flow.name,
    selectedNodeId: flow.selectedNodeId ?? null,
    activeRunId: flow.activeRunId ?? null,
    runStatus: flow.runStatus ?? null,
    isRunning: flow.isRunning ?? false,
    edges: flow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
    nodes: flow.nodes.map((node) => {
      if (node.type === "manual-trigger") {
        return {
          id: node.id,
          type: node.type,
          label: node.data.label,
          payload: node.data.payload,
          position: node.position,
        };
      }

      if (node.type === "stop") {
        return {
          id: node.id,
          type: node.type,
          label: node.data.label,
          position: node.position,
        };
      }

      return {
        id: node.id,
        type: node.type,
        label: node.data.label,
        prompt: node.data.prompt,
        skill: node.data.skill,
        permissions: node.data.permissions,
        position: node.position,
      };
    }),
  };
}

export function buildFlowContextMessage(flow: FlowBuilderChatContext): string {
  const snapshot = sanitizeFlowForChat(flow);
  const agentSummaries = flow.nodes
    .filter(isAgentNode)
    .map(
      (node) =>
        `- ${getNodeLabel(node)} (${node.id}, ${node.type}): skill=${getSkillDisplayName(node.data.skill) ?? "none"}, permissions=[${node.data.permissions.join(", ") || "none"}]`
    )
    .join("\n");

  const runLine = flow.activeRunId
    ? `Active run: ${flow.activeRunId} (${flow.runStatus ?? "unknown"})`
    : "No active run.";

  const lastRunSection = flow.lastRun?.runId
    ? [
        "Latest workflow run diagnostics:",
        formatRunDiagnosticsForChat({
          runId: flow.lastRun.runId,
          status:
            flow.lastRun.status === "completed" ||
            flow.lastRun.status === "failed" ||
            flow.lastRun.status === "cancelled" ||
            flow.lastRun.status === "running"
              ? flow.lastRun.status
              : "failed",
          events: flow.lastRun.events ?? [],
          nodeStates: flow.lastRun.nodeOutputs ?? {},
          results: flow.lastRun.results ?? null,
          error: flow.lastRun.error ?? null,
        }),
      ].join("\n\n")
    : "No workflow run logs available yet.";

  const missingCredentials = getMissingFlowRequirements(flow.nodes);
  const missingSection = formatMissingRequirementsForChat(missingCredentials);

  return [
    "Current flow snapshot (JSON):",
    JSON.stringify(snapshot, null, 2),
    "",
    agentSummaries ? `Agents:\n${agentSummaries}` : "No agent nodes yet.",
    flow.selectedNodeId
      ? `User currently selected node: ${flow.selectedNodeId}`
      : "No node selected.",
    runLine,
    flow.isRunning ? "A workflow run is in progress." : "No run in progress.",
    "",
    "Credential and readiness gate:",
    missingSection,
    "",
    lastRunSection,
  ].join("\n");
}

export function parseFlowActions(content: string): FlowBuilderActions {
  const blocks = [...content.matchAll(/```json\s*([\s\S]*?)```/gi)];
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const parsed = tryParseActionsPayload(blocks[index][1]);
    if (parsed) {
      return parsed;
    }
  }

  const inline = content.match(/\{[\s\S]*"actions"\s*:\s*\{[\s\S]*\}\s*\}/);
  if (inline?.[0]) {
    const parsed = tryParseActionsPayload(inline[0]);
    if (parsed) {
      return parsed;
    }
  }

  return {};
}

function tryParseActionsPayload(raw: string): FlowBuilderActions | null {
  const trimmed = raw.trim().replace(/^```json|```$/g, "").trim();

  try {
    const parsed = JSON.parse(trimmed) as FlowBuilderActionsPayload;
    if (parsed.actions && typeof parsed.actions === "object") {
      return parsed.actions;
    }
    if (Array.isArray(parsed.updates)) {
      return { updates: parsed.updates };
    }
    if (looksLikeFlowActions(parsed)) {
      return parsed as FlowBuilderActions;
    }
    return null;
  } catch {
    return null;
  }
}

function looksLikeFlowActions(value: unknown): value is FlowBuilderActions {
  if (!value || typeof value !== "object") {
    return false;
  }

  const keys = Object.keys(value);
  return keys.some((key) =>
    [
      "addNodes",
      "updates",
      "removeNodeIds",
      "addEdges",
      "runFlow",
      "stopFlow",
      "name",
    ].includes(key)
  );
}

const APPLY_FLOW_ACTIONS_TOOL = {
  name: "apply_flow_actions",
  description:
    "Apply changes to the flow builder canvas: add/remove/connect nodes, move nodes by coordinates, configure skills and prompts, rename flow, run or stop execution. Required for any build or modify request.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "New flow title" },
      addNodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: {
              type: "string",
              enum: ["manual-trigger", "claude-code", "open-code", "stop"],
            },
            label: { type: "string" },
            prompt: { type: "string" },
            payload: { type: "string" },
            permissions: {
              type: "array",
              items: { type: "string", enum: ["github"] },
            },
            connectFrom: { type: "string" },
            position: {
              type: "object",
              description: "Canvas position { x, y }",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
              required: ["x", "y"],
            },
            skill: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                instructions: { type: "string" },
                script: {
                  type: "string",
                  description: "Bash script run before the agent executes",
                },
              },
            },
            secrets: {
              type: "object",
              description:
                "Do not invent secrets — only set when user explicitly provided values in chat",
              properties: {
                anthropicApiKey: { type: "string" },
                githubToken: { type: "string" },
                githubRepoUrl: { type: "string" },
                githubUser: { type: "string" },
              },
            },
          },
          required: ["type"],
        },
      },
      removeNodeIds: { type: "array", items: { type: "string" } },
      addEdges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            source: { type: "string" },
            target: { type: "string" },
          },
          required: ["source", "target"],
        },
      },
      removeEdgeIds: { type: "array", items: { type: "string" } },
      updates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nodeId: { type: "string" },
            label: { type: "string" },
            prompt: { type: "string" },
            payload: { type: "string" },
            position: {
              type: "object",
              description: "Canvas position { x, y }",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
              required: ["x", "y"],
            },
            permissions: {
              type: "array",
              items: { type: "string", enum: ["github"] },
            },
            skill: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                instructions: { type: "string" },
                script: { type: "string" },
              },
            },
            secrets: {
              type: "object",
              properties: {
                anthropicApiKey: { type: "string" },
                githubToken: { type: "string" },
                githubRepoUrl: { type: "string" },
                githubUser: { type: "string" },
              },
            },
          },
        },
      },
      selectNodeId: { type: ["string", "null"] },
      runFlow: { type: "boolean" },
      stopFlow: { type: "boolean" },
    },
  },
};

function getLastUserMessage(messages: FlowBuilderChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user");
}

function resolveFlowActions(params: {
  content: string;
  toolActions: FlowBuilderActions | null;
  messages: FlowBuilderChatMessage[];
  flow: FlowBuilderChatContext;
}): FlowBuilderActions {
  if (params.toolActions && !isActionsEmpty(params.toolActions)) {
    return params.toolActions;
  }

  const fromMarkdown = parseFlowActions(params.content);
  if (!isActionsEmpty(fromMarkdown)) {
    return fromMarkdown;
  }

  const lastUser = getLastUserMessage(params.messages);
  if (lastUser) {
    const inferred = inferFlowActionsFromUserMessage(lastUser.content, params.flow);
    if (inferred && !isActionsEmpty(inferred)) {
      return inferred;
    }
  }

  return {};
}

export { isActionsEmpty, isCreateOrBuildRequest, isEndToEndBuildRequest };

export function stripActionsBlock(content: string): string {
  return content.replace(/```json\s*[\s\S]*?```/gi, "").trim();
}

export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Add it to .env.local."
    );
  }
  return key;
}

function formatAnthropicError(errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { type?: string; message?: string };
      message?: string;
    };
    if (parsed.error?.message) {
      return parsed.error.message;
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    // Use raw text below.
  }

  return errorText.trim() || "Anthropic API request failed";
}

export function applyFlowActions(params: {
  flowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId?: string | null;
  actions: FlowBuilderActions;
}): AppliedFlowActionsResult {
  const summary: string[] = [];
  let nodes = [...params.nodes];
  let edges = [...params.edges];
  let flowName = params.flowName;
  let selectedNodeId = params.selectedNodeId ?? null;

  if (params.actions.name?.trim()) {
    flowName = params.actions.name.trim();
    summary.push(`Renamed flow to "${flowName}"`);
  }

  if (params.actions.removeNodeIds?.length) {
    const removeIds = new Set(params.actions.removeNodeIds);
    const removed = nodes.filter((node) => removeIds.has(node.id)).length;
    nodes = nodes.filter((node) => !removeIds.has(node.id));
    edges = edges.filter(
      (edge) => !removeIds.has(edge.source) && !removeIds.has(edge.target)
    );
    if (removed > 0) {
      summary.push(`Removed ${removed} node${removed === 1 ? "" : "s"}`);
    }
    if (selectedNodeId && removeIds.has(selectedNodeId)) {
      selectedNodeId = nodes[0]?.id ?? null;
    }
  }

  if (params.actions.removeEdgeIds?.length) {
    const removeIds = new Set(params.actions.removeEdgeIds);
    const before = edges.length;
    edges = edges.filter((edge) => !removeIds.has(edge.id));
    const removed = before - edges.length;
    if (removed > 0) {
      summary.push(`Removed ${removed} edge${removed === 1 ? "" : "s"}`);
    }
  }

  if (params.actions.addNodes?.length) {
    for (const action of params.actions.addNodes) {
      if (
        action.type === "manual-trigger" &&
        nodes.some((node) => node.type === "manual-trigger")
      ) {
        summary.push("Skipped Start node (flow already has one)");
        continue;
      }

      const newNode = createNodeFromAction(action, nodes);
      nodes = [...nodes, newNode];
      summary.push(`Added ${action.type} node "${getNodeLabel(newNode)}"`);

      if (action.connectFrom) {
        edges = [
          ...edges,
          {
            id: crypto.randomUUID(),
            source: action.connectFrom,
            target: newNode.id,
          },
        ];
        summary.push(`Connected ${action.connectFrom} → ${newNode.id}`);
      }
    }
  }

  if (params.actions.addEdges?.length) {
    for (const edge of params.actions.addEdges) {
      edges = [
        ...edges,
        {
          id: edge.id ?? crypto.randomUUID(),
          source: edge.source,
          target: edge.target,
        },
      ];
    }
    summary.push(`Added ${params.actions.addEdges.length} edge(s)`);
  }

  if (params.actions.updates?.length) {
    let updateCount = 0;
    let movedCount = 0;
    nodes = nodes.map((node) => {
      const update = findNodeUpdate(node, params.actions.updates!);
      if (!update) {
        return node;
      }
      updateCount += 1;
      if (update.position !== undefined) {
        movedCount += 1;
      }
      return applyNodeUpdate(node, update);
    });
    if (updateCount > 0) {
      summary.push(`Updated ${updateCount} node${updateCount === 1 ? "" : "s"}`);
    }
    if (movedCount > 0) {
      summary.push(`Repositioned ${movedCount} node${movedCount === 1 ? "" : "s"}`);
    }
  }

  if (params.actions.selectNodeId !== undefined) {
    selectedNodeId = params.actions.selectNodeId;
    if (selectedNodeId) {
      summary.push(`Selected node ${selectedNodeId}`);
    }
  }

  if (params.actions.runFlow) {
    summary.push("Requested flow run");
  }

  if (params.actions.stopFlow) {
    summary.push("Requested flow stop");
  }

  return {
    flowName,
    nodes,
    edges,
    selectedNodeId,
    runFlow: Boolean(params.actions.runFlow),
    stopFlow: Boolean(params.actions.stopFlow),
    summary,
  };
}

export async function streamFlowBuilderChat(params: {
  messages: FlowBuilderChatMessage[];
  flow: FlowBuilderChatContext;
  onEvent: (event: FlowBuilderChatStreamEvent) => void;
}): Promise<{ content: string; actions: FlowBuilderActions }> {
  const apiKey = getAnthropicApiKey();
  const contextMessage = buildFlowContextMessage(params.flow);
  const lastUser = getLastUserMessage(params.messages);
  const forceTool = lastUser ? isCreateOrBuildRequest(lastUser.content) : false;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      stream: true,
      tools: [APPLY_FLOW_ACTIONS_TOOL],
      tool_choice: forceTool
        ? { type: "tool", name: "apply_flow_actions" }
        : { type: "auto" },
      messages: [
        {
          role: "user",
          content: contextMessage,
        },
        {
          role: "assistant",
          content:
            "Understood. I will call apply_flow_actions to create and modify nodes on the canvas. I will not ask the user to manually configure the builder.",
        },
        ...params.messages.map((message) => ({
          role: message.role,
          content:
            message.role === "assistant" && message.segments?.length
              ? message.segments
                  .filter(
                    (segment): segment is Extract<FlowBuilderChatSegment, { type: "text" }> =>
                      segment.type === "text"
                  )
                  .map((segment) => segment.content)
                  .join("\n\n")
                  .trim() || "(Applied canvas changes)"
              : message.content,
        })),
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatAnthropicError(errorText));
  }

  if (!response.body) {
    throw new Error("Anthropic API returned an empty stream");
  }

  let content = "";
  let toolInputJson = "";
  let toolActions: FlowBuilderActions | null = null;
  let activeBlockType: "text" | "tool_use" | null = null;
  let activeToolInputJson = "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: {
            type?: string;
            text?: string;
            partial_json?: string;
          };
          content_block?: { type?: string; name?: string };
        };

        if (event.type === "content_block_start") {
          if (event.content_block?.type === "text") {
            activeBlockType = "text";
            params.onEvent({ type: "text_start" });
          } else if (event.content_block?.type === "tool_use") {
            activeBlockType = "tool_use";
            activeToolInputJson = "";
          }
        }

        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          content += event.delta.text;
          params.onEvent({ type: "token", token: event.delta.text });
        }

        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "input_json_delta" &&
          event.delta.partial_json
        ) {
          toolInputJson += event.delta.partial_json;
          if (activeBlockType === "tool_use") {
            activeToolInputJson += event.delta.partial_json;
          }
        }

        if (event.type === "content_block_stop") {
          if (activeBlockType === "text") {
            params.onEvent({ type: "text_end" });
          } else if (activeBlockType === "tool_use" && activeToolInputJson) {
            try {
              const blockActions = JSON.parse(
                activeToolInputJson
              ) as FlowBuilderActions;
              toolActions = blockActions;
              params.onEvent({ type: "actions", actions: blockActions });
            } catch {
              // Wait for final parse below.
            }
          }
          activeBlockType = null;
          activeToolInputJson = "";
        }
      } catch {
        // Ignore malformed SSE chunks.
      }
    }
  }

  if (toolInputJson && !toolActions) {
    try {
      toolActions = JSON.parse(toolInputJson) as FlowBuilderActions;
    } catch {
      toolActions = null;
    }
  }

  const actions = resolveFlowActions({
    content,
    toolActions,
    messages: params.messages,
    flow: params.flow,
  });

  params.onEvent({ type: "done", content, actions });

  return { content, actions };
}
