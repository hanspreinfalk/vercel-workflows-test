import { isAgentNode } from "@/lib/agent/node-utils";
import { hasActiveSkill, hasActiveSkillScript } from "@/lib/agent/skills";
import type { ClaudeNodeSecrets, FlowNode } from "@/lib/flow/types";

export type CredentialField =
  | "anthropicApiKey"
  | "githubToken"
  | "githubRepoUrl"
  | "githubUser";

export type FlowRequirementIssue = {
  nodeId: string;
  nodeLabel: string;
  kind: "credential" | "skill" | "script" | "prompt";
  field?: CredentialField;
  message: string;
};

const CREDENTIAL_LABELS: Record<CredentialField, string> = {
  anthropicApiKey: "Anthropic API key",
  githubToken: "GitHub token",
  githubRepoUrl: "GitHub repo URL",
  githubUser: "GitHub username",
};

export function getCredentialLabel(field: CredentialField): string {
  return CREDENTIAL_LABELS[field];
}

export function getMissingFlowRequirements(nodes: FlowNode[]): FlowRequirementIssue[] {
  const issues: FlowRequirementIssue[] = [];

  for (const node of nodes) {
    if (!isAgentNode(node)) {
      continue;
    }

    const { label, skill, prompt, permissions, secrets } = node.data;

    if (!hasActiveSkill(skill)) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        kind: "skill",
        message: `"${label}" needs a skill with name and instructions.`,
      });
    }

    if (hasActiveSkill(skill) && !hasActiveSkillScript(skill)) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        kind: "script",
        message: `"${label}" needs an executable skill script (bash).`,
      });
    }

    if (!prompt.trim() || prompt.trim() === "Describe what this agent should do.") {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        kind: "prompt",
        message: `"${label}" needs a concrete task prompt for this run.`,
      });
    }

    if (!secrets.anthropicApiKey?.trim()) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        kind: "credential",
        field: "anthropicApiKey",
        message: `"${label}" requires an Anthropic API key before it can run.`,
      });
    }

    if (permissions.includes("github")) {
      if (!secrets.githubToken?.trim()) {
        issues.push({
          nodeId: node.id,
          nodeLabel: label,
          kind: "credential",
          field: "githubToken",
          message: `"${label}" requires a GitHub token (permission enabled).`,
        });
      }
      if (!secrets.githubRepoUrl?.trim()) {
        issues.push({
          nodeId: node.id,
          nodeLabel: label,
          kind: "credential",
          field: "githubRepoUrl",
          message: `"${label}" requires a GitHub repo URL (permission enabled).`,
        });
      }
    }
  }

  return issues;
}

export function canRunFlow(nodes: FlowNode[]): boolean {
  return getMissingFlowRequirements(nodes).length === 0;
}

export function formatMissingRequirementsForChat(
  issues: FlowRequirementIssue[]
): string {
  if (issues.length === 0) {
    return "All agent nodes have skills, scripts, prompts, and required credentials.";
  }

  const lines = issues.map(
    (issue) =>
      `- [${issue.kind}] ${issue.nodeLabel} (${issue.nodeId}): ${issue.message}`
  );

  return [
    "Run is BLOCKED until the user provides the following in the Credentials panel:",
    ...lines,
    "",
    "Do NOT set runFlow: true until missingCredentials is empty.",
    "Ask the user clearly for each token (Anthropic, GitHub, etc.) and tell them to paste values into the Credentials panel for the matching node.",
  ].join("\n");
}

export function patchNodeSecret(
  node: FlowNode,
  field: CredentialField,
  value: string
): FlowNode {
  if (!isAgentNode(node)) {
    return node;
  }

  return {
    ...node,
    data: {
      ...node.data,
      secrets: {
        ...node.data.secrets,
        [field]: value.trim() || undefined,
      },
    },
  };
}

export function getRequiredCredentialFieldsForNode(
  node: FlowNode
): CredentialField[] {
  if (!isAgentNode(node)) {
    return [];
  }

  const fields: CredentialField[] = ["anthropicApiKey"];
  if (node.data.permissions.includes("github")) {
    fields.push("githubToken", "githubRepoUrl");
  }
  return fields;
}
