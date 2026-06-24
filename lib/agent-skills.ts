import type { Sandbox } from "@vercel/sandbox";
import type { AgentNodeData, AgentSkill, FlowNode } from "@/lib/flow-types";
import { isAgentNode } from "@/lib/agent-node-utils";

export const EMPTY_AGENT_SKILL: AgentSkill = {
  name: "",
  description: "",
  instructions: "",
};

export type SkillTemplate = {
  id: string;
  label: string;
  skill: AgentSkill;
};

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: "custom",
    label: "Custom skill",
    skill: {
      name: "custom-automation",
      description: "Repeatable workflow for this agent node.",
      instructions: `# Custom automation

Describe the repeatable steps this agent should follow every time it runs.

## Steps
1. 
2. 
3. 

## Output
- What should the agent return when finished?
`,
    },
  },
  {
    id: "pr-review",
    label: "PR review",
    skill: {
      name: "pr-review",
      description: "Review pull requests with a consistent checklist.",
      instructions: `# PR review

Review the pull request associated with this change.

## Checklist
- Correctness and edge cases
- Tests added or updated where needed
- Security and secret handling
- Clear commit/PR description

## Output
Return a concise review: summary, blocking issues, and optional suggestions.`,
    },
  },
  {
    id: "fix-ci",
    label: "Fix CI",
    skill: {
      name: "fix-ci",
      description: "Diagnose and fix failing CI checks.",
      instructions: `# Fix CI

Investigate failing CI checks and apply the smallest fix that makes them pass.

## Steps
1. Identify failing jobs and read logs
2. Reproduce locally when possible
3. Fix root cause (avoid masking failures)
4. Run relevant tests before finishing

## Output
Summarize what failed, what you changed, and how you verified the fix.`,
    },
  },
  {
    id: "write-tests",
    label: "Write tests",
    skill: {
      name: "write-tests",
      description: "Add or extend tests for changed behavior.",
      instructions: `# Write tests

Add tests that cover the behavior described in the task prompt.

## Guidelines
- Match existing test style and frameworks
- Cover happy path and important edge cases
- Avoid brittle assertions

## Output
List new/updated test files and what each covers.`,
    },
  },
  {
    id: "release-notes",
    label: "Release notes",
    skill: {
      name: "release-notes",
      description: "Draft user-facing release notes from changes.",
      instructions: `# Release notes

Draft release notes from the work completed in this run.

## Format
- **Added** — new capabilities
- **Changed** — behavior updates
- **Fixed** — bug fixes

Keep entries short and user-focused.`,
    },
  },
];

export function slugifySkillName(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "node-skill";
}

export function normalizeAgentSkill(
  skill?: Partial<AgentSkill> | null
): AgentSkill {
  return {
    name: skill?.name?.trim() ?? "",
    description: skill?.description?.trim() ?? "",
    instructions: skill?.instructions ?? "",
  };
}

export function normalizeAgentNodeData(
  data: Partial<AgentNodeData> & { skill?: Partial<AgentSkill> | null }
): AgentNodeData {
  return {
    label: data.label ?? "Agent",
    prompt: data.prompt ?? "",
    permissions: data.permissions ?? [],
    secrets: data.secrets ?? {},
    skill: normalizeAgentSkill(data.skill),
  };
}

export function normalizeFlowNodes(nodes: FlowNode[]): FlowNode[] {
  return nodes.map((node) => {
    if (!isAgentNode(node)) {
      return node;
    }

    return {
      ...node,
      data: normalizeAgentNodeData(node.data),
    };
  });
}

export function hasActiveSkill(skill: AgentSkill): boolean {
  return Boolean(skill.name.trim() && skill.instructions.trim());
}

export function formatSkillMarkdown(skill: AgentSkill): string {
  const name = slugifySkillName(skill.name);
  const description =
    skill.description.trim() || "Repeatable workflow skill for this agent node.";

  return `---
name: ${name}
description: ${description.replace(/\n/g, " ")}
---

${skill.instructions.trim()}
`;
}

export function getSkillInstallPath(skill: AgentSkill): string {
  return `.cursor/skills/${slugifySkillName(skill.name)}/SKILL.md`;
}

export async function installAgentSkill(sandbox: Sandbox, skill: AgentSkill) {
  if (!hasActiveSkill(skill)) {
    return null;
  }

  const path = getSkillInstallPath(skill);
  await sandbox.writeFiles([
    {
      path,
      content: Buffer.from(formatSkillMarkdown(skill), "utf-8"),
    },
  ]);

  return path;
}

export function skillPromptPrefix(skill: AgentSkill): string {
  if (!hasActiveSkill(skill)) {
    return "";
  }

  const path = getSkillInstallPath(skill);
  return [
    `Follow the repeatable workflow defined in the project skill at ${path}.`,
    "Read that skill file first, then execute the task prompt below.",
    "",
  ].join("\n");
}

export function getSkillDisplayName(skill: AgentSkill): string | null {
  if (!hasActiveSkill(skill)) {
    return null;
  }

  return slugifySkillName(skill.name);
}
