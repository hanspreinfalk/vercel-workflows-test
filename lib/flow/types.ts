export type NodePermission = "github";

export type AgentSkill = {
  /** URL-safe skill id (directory name under .cursor/skills/). */
  name: string;
  /** Short summary shown in skill frontmatter. */
  description: string;
  /** Markdown body — repeatable workflow instructions for the agent. */
  instructions: string;
  /** Optional shell script installed and run before the agent (scripts/<name>.sh). */
  script?: string;
};

export type ClaudeNodeSecrets = {
  anthropicApiKey?: string;
  githubToken?: string;
  githubRepoUrl?: string;
  githubUser?: string;
};

export type ClaudeCodeNodeData = {
  label: string;
  /** System prompt sent to the agent when this node runs. */
  prompt: string;
  /** Repeatable workflow skill installed in the sandbox as .cursor/skills/<name>/SKILL.md */
  skill: AgentSkill;
  permissions: NodePermission[];
  secrets: ClaudeNodeSecrets;
};

/** Shared shape for Claude Code and OpenCode agent nodes. */
export type AgentNodeData = ClaudeCodeNodeData;

export type ManualTriggerNodeData = {
  label: string;
  /** Optional payload passed to downstream nodes when you click Run. */
  payload: string;
};

export type StopNodeData = {
  label: string;
};

export type FlowNode =
  | {
      id: string;
      type: "claude-code";
      position: { x: number; y: number };
      data: AgentNodeData;
    }
  | {
      id: string;
      type: "open-code";
      position: { x: number; y: number };
      data: AgentNodeData;
    }
  | {
      id: string;
      type: "manual-trigger";
      position: { x: number; y: number };
      data: ManualTriggerNodeData;
    }
  | {
      id: string;
      type: "stop";
      position: { x: number; y: number };
      data: StopNodeData;
    };

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
};

export type FlowDefinition = {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: number;
  updatedAt: number;
  /** Research pipeline source links (optional). */
  sourceInterviewId?: string;
  sourceRecordingId?: string;
};

/** Snapshot passed into the Vercel Workflow at run time (includes secrets). */
export type FlowRunSnapshot = {
  flowId: string;
  flowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type FlowNodeResult = {
  nodeId: string;
  label: string;
  output: string;
  status: "completed" | "failed";
};

export function getNodeLabel(node: FlowNode): string {
  return node.data.label;
}

export function createDefaultClaudeNode(
  id: string,
  position: { x: number; y: number },
  label: string
): Extract<FlowNode, { type: "claude-code" }> {
  return createDefaultAgentNode(id, position, label, "claude-code");
}

export function createDefaultOpenCodeNode(
  id: string,
  position: { x: number; y: number },
  label: string
): Extract<FlowNode, { type: "open-code" }> {
  return createDefaultAgentNode(id, position, label, "open-code");
}

export function createDefaultAgentNode(
  id: string,
  position: { x: number; y: number },
  label: string,
  type: "claude-code"
): Extract<FlowNode, { type: "claude-code" }>;
export function createDefaultAgentNode(
  id: string,
  position: { x: number; y: number },
  label: string,
  type: "open-code"
): Extract<FlowNode, { type: "open-code" }>;
export function createDefaultAgentNode(
  id: string,
  position: { x: number; y: number },
  label: string,
  type: "claude-code" | "open-code"
): Extract<FlowNode, { type: "claude-code" | "open-code" }> {
  return {
    id,
    type,
    position,
    data: {
      label,
      prompt: "Describe what this agent should do.",
      skill: { name: "", description: "", instructions: "" },
      permissions: [],
      secrets: {},
    },
  };
}

export function createManualTriggerNode(
  id: string,
  position: { x: number; y: number },
  label = "Start"
): Extract<FlowNode, { type: "manual-trigger" }> {
  return {
    id,
    type: "manual-trigger",
    position,
    data: {
      label,
      payload: "",
    },
  };
}

export function createStopNode(
  id: string,
  position: { x: number; y: number },
  label = "Stop"
): Extract<FlowNode, { type: "stop" }> {
  return {
    id,
    type: "stop",
    position,
    data: { label },
  };
}

export function createDefaultFlow(name = "Untitled flow"): FlowDefinition {
  const trigger = createManualTriggerNode(
    "trigger-1",
    { x: 40, y: 140 },
    "Start"
  );

  return {
    id: crypto.randomUUID(),
    name,
    nodes: [trigger],
    edges: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
