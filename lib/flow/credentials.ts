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
    "Run is BLOCKED until the user provides the following:",
    ...lines,
    "",
    "Call **request_credentials** for each agent that needs secrets — never ask users to paste API keys or tokens in chat.",
    "Do NOT set runFlow: true until missingCredentials is empty.",
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
  return getCredentialFieldsForNode(node);
}

/** All credential fields shown/edited for an agent (required + optional). */
export function getCredentialFieldsForNode(node: FlowNode): CredentialField[] {
  if (!isAgentNode(node)) {
    return [];
  }

  const fields: CredentialField[] = ["anthropicApiKey"];
  if (node.data.permissions.includes("github")) {
    fields.push("githubToken", "githubRepoUrl", "githubUser");
  }
  return fields;
}

export type AgentCredentialFieldStatus = {
  field: CredentialField;
  label: string;
  value: string;
  configured: boolean;
  isSecret: boolean;
};

export type AgentCredentialSummary = {
  nodeId: string;
  nodeLabel: string;
  nodeType: "claude-code" | "open-code";
  permissions: string[];
  fields: AgentCredentialFieldStatus[];
  configuredCount: number;
  requiredCount: number;
  isReady: boolean;
};

const REQUIRED_FIELDS: CredentialField[] = [
  "anthropicApiKey",
  "githubToken",
  "githubRepoUrl",
];

export function isCredentialFieldRequired(
  node: FlowNode,
  field: CredentialField
): boolean {
  if (!isAgentNode(node)) {
    return false;
  }

  if (field === "anthropicApiKey") {
    return true;
  }

  if (field === "githubUser") {
    return false;
  }

  return (
    node.data.permissions.includes("github") &&
    (field === "githubToken" || field === "githubRepoUrl")
  );
}

export function maskCredentialValue(value: string, isSecret: boolean): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "—";
  }

  if (!isSecret) {
    return trimmed;
  }

  if (trimmed.length <= 8) {
    return "••••••••";
  }

  return `${trimmed.slice(0, 4)}${"•".repeat(Math.min(12, trimmed.length - 8))}${trimmed.slice(-4)}`;
}

export function getAgentCredentialSummaries(
  nodes: FlowNode[]
): AgentCredentialSummary[] {
  return nodes.filter(isAgentNode).map((node) => {
    const fields = getCredentialFieldsForNode(node).map((field) => {
      const value = node.data.secrets[field] ?? "";
      const isSecret = field.includes("Token") || field.includes("Key");
      return {
        field,
        label: getCredentialLabel(field),
        value,
        configured: Boolean(value.trim()),
        isSecret,
      };
    });

    const requiredCount = fields.filter((item) =>
      isCredentialFieldRequired(node, item.field)
    ).length;

    const configuredRequired = fields.filter(
      (item) =>
        isCredentialFieldRequired(node, item.field) && item.configured
    ).length;

    return {
      nodeId: node.id,
      nodeLabel: node.data.label,
      nodeType: node.type,
      permissions: node.data.permissions,
      fields,
      configuredCount: configuredRequired,
      requiredCount,
      isReady: configuredRequired === requiredCount,
    };
  });
}

export type CredentialRequestPayload = {
  nodeId?: string;
  nodeLabel?: string;
  fields?: CredentialField[];
  reason?: string;
};

export type ResolvedCredentialRequest = {
  id: string;
  nodeId: string;
  nodeLabel: string;
  fields: CredentialField[];
  reason?: string;
};

export function resolveCredentialRequest(
  nodes: FlowNode[],
  payload: CredentialRequestPayload
): ResolvedCredentialRequest | null {
  const agentNodes = nodes.filter(isAgentNode);

  let node =
    payload.nodeId != null
      ? agentNodes.find((item) => item.id === payload.nodeId)
      : undefined;

  if (!node && payload.nodeLabel?.trim()) {
    const label = payload.nodeLabel.trim().toLowerCase();
    node = agentNodes.find(
      (item) => item.data.label.trim().toLowerCase() === label
    );
  }

  if (!node) {
    node = agentNodes[0];
  }

  if (!node) {
    return null;
  }

  const required = getRequiredCredentialFieldsForNode(node);
  const missing = required.filter((field) => !node!.data.secrets[field]?.trim());
  const requested = (payload.fields ?? []).filter((field) =>
    required.includes(field)
  );
  const fields =
    requested.length > 0 ? requested : missing.length > 0 ? missing : required;

  if (fields.length === 0) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    nodeId: node.id,
    nodeLabel: node.data.label,
    fields,
    reason: payload.reason?.trim() || undefined,
  };
}

export function formatCredentialSavedMessage(params: {
  nodeLabel: string;
  fields: CredentialField[];
}): string {
  const labels = params.fields.map((field) => getCredentialLabel(field));
  return [
    "[Credentials saved locally — values not included in chat]",
    `Configured ${labels.join(", ")} for "${params.nodeLabel}".`,
    "You may proceed with the workflow run when ready.",
  ].join(" ");
}
