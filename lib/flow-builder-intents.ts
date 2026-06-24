import { isAgentNode } from "@/lib/agent-node-utils";
import type { AgentSkill, NodePermission } from "@/lib/flow-types";
import type {
  FlowBuilderActions,
  FlowBuilderChatContext,
} from "@/lib/flow-builder-chat";

const REPO_SUMMARY_SKILL: AgentSkill = {
  name: "repo-summary",
  description: "Summarize a GitHub repository into structured Markdown.",
  instructions: `# Repo Summary

1. Read the GitHub repository URL from the Start node output
2. Clone or fetch the repository (GitHub access is enabled)
3. Scan the repo structure: README, manifests, config, and source directories
4. Read key files to understand purpose and architecture
5. Return Markdown with these sections:
   - Purpose
   - Tech Stack
   - Architecture
   - Key Features
   - Entry Points
   - Setup & Usage
   - Notable Patterns`,
};

export function isCreateOrBuildRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\b(create|build|set up|setup|make|add|wire|configure)\b/.test(lower) &&
    /\b(agent|flow|workflow|node|skill|summar|repo|github)\b/.test(lower)
  );
}

export function isRepoSummarizerRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\b(summar(y|ize|ies)|summaries)\b/.test(lower) &&
    /\b(repo|repository|github)\b/.test(lower)
  );
}

export function isActionsEmpty(actions: FlowBuilderActions): boolean {
  return !(
    actions.name ||
    actions.addNodes?.length ||
    actions.removeNodeIds?.length ||
    actions.addEdges?.length ||
    actions.removeEdgeIds?.length ||
    actions.updates?.length ||
    actions.selectNodeId !== undefined ||
    actions.runFlow ||
    actions.stopFlow
  );
}

export function inferFlowActionsFromUserMessage(
  message: string,
  flow: FlowBuilderChatContext
): FlowBuilderActions | null {
  if (!isCreateOrBuildRequest(message) && !isRepoSummarizerRequest(message)) {
    return null;
  }

  if (isRepoSummarizerRequest(message) || /\bgithub\b/.test(message.toLowerCase())) {
    return buildRepoSummarizerActions(flow);
  }

  return buildSingleAgentFromRequest(flow, message);
}

function buildRepoSummarizerActions(
  flow: FlowBuilderChatContext
): FlowBuilderActions {
  const trigger = flow.nodes.find((node) => node.type === "manual-trigger");
  const agents = flow.nodes.filter(isAgentNode);
  const keepAgent = agents[0];
  const removeAgentIds = agents.slice(1).map((node) => node.id);

  const updates = [];

  if (trigger) {
    updates.push({
      nodeId: trigger.id,
      label: "Start",
      payload: "https://github.com/owner/repo",
    });
  }

  if (keepAgent) {
    updates.push({
      nodeId: keepAgent.id,
      label: "Repo Summarizer",
      prompt:
        "Summarize the entire GitHub repository URL from the Start node. Output structured Markdown.",
      permissions: ["github"] as NodePermission[],
      skill: REPO_SUMMARY_SKILL,
    });
  }

  const removeEdgeIds = flow.edges
    .filter(
      (edge) =>
        removeAgentIds.includes(edge.source) ||
        removeAgentIds.includes(edge.target)
    )
    .map((edge) => edge.id);

  const actions: FlowBuilderActions = {
    name: "GitHub Repo Summarizer",
    removeNodeIds: removeAgentIds,
    removeEdgeIds,
    updates,
    selectNodeId: keepAgent?.id ?? "repo-summarizer",
  };

  if (!keepAgent) {
    actions.addNodes = [
      {
        id: "repo-summarizer",
        type: "claude-code",
        label: "Repo Summarizer",
        prompt:
          "Summarize the entire GitHub repository URL from the Start node. Output structured Markdown.",
        permissions: ["github"],
        skill: REPO_SUMMARY_SKILL,
        connectFrom: trigger?.id,
      },
    ];
  }

  if (trigger && keepAgent) {
    const hasTriggerEdge = flow.edges.some(
      (edge) => edge.source === trigger.id && edge.target === keepAgent.id
    );
    if (!hasTriggerEdge) {
      actions.addEdges = [{ source: trigger.id, target: keepAgent.id }];
    }
  }

  return actions;
}

function buildSingleAgentFromRequest(
  flow: FlowBuilderChatContext,
  message: string
): FlowBuilderActions {
  const trigger = flow.nodes.find((node) => node.type === "manual-trigger");
  const agents = flow.nodes.filter(isAgentNode);
  const keepAgent = agents[0];
  const removeAgentIds = agents.slice(1).map((node) => node.id);

  const updates = [];

  if (keepAgent) {
    updates.push({
      nodeId: keepAgent.id,
      label: keepAgent.data.label || "Agent 1",
      prompt: message.trim(),
    });
  }

  return {
    removeNodeIds: removeAgentIds,
    removeEdgeIds: flow.edges
      .filter(
        (edge) =>
          removeAgentIds.includes(edge.source) ||
          removeAgentIds.includes(edge.target)
      )
      .map((edge) => edge.id),
    updates,
    selectNodeId: keepAgent?.id ?? null,
    addNodes: keepAgent
      ? undefined
      : [
          {
            type: "claude-code",
            label: "Agent 1",
            prompt: message.trim(),
            connectFrom: trigger?.id,
          },
        ],
  };
}
