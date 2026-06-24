"use client";

import { GitHubIcon } from "@/app/components/icons/github-icon";
import { AgentRuntimeIcon } from "@/app/components/icons/agent-runtime-icon";
import type { AgentNodeData, AgentSkill, FlowNode, ManualTriggerNodeData, StopNodeData } from "@/lib/flow-types";
import type { AgentFlowNode } from "@/lib/agent-node-utils";
import { isAgentNode } from "@/lib/agent-node-utils";
import {
  SKILL_TEMPLATES,
  slugifySkillName,
} from "@/lib/agent-skills";

type NodeInspectorProps = {
  node: FlowNode | null;
  onChange: (node: FlowNode) => void;
  onClose?: () => void;
  onRemove?: () => void;
};

const PERMISSIONS = [
  {
    id: "github" as const,
    label: "GitHub",
    hint: "Install gh, clone repo, and configure git credentials in an isolated sandbox",
  },
];

function SecretField(props: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {props.label}
      </span>
      <input
        type="password"
        value={props.value ?? ""}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
      />
    </label>
  );
}

function ManualTriggerInspector({
  node,
  onChange,
}: {
  node: Extract<FlowNode, { type: "manual-trigger" }>;
  onChange: (node: FlowNode) => void;
}) {
  const data = node.data;

  function patch(partial: Partial<ManualTriggerNodeData>) {
    onChange({
      ...node,
      data: { ...data, ...partial },
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-800 dark:text-emerald-200">
        This node starts the flow when you click <strong>Run</strong> in the
        toolbar. Connect it to downstream agent nodes.
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Label
        </span>
        <input
          value={data.label}
          onChange={(event) => patch({ label: event.target.value })}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Start payload
        </span>
        <textarea
          value={data.payload}
          onChange={(event) => patch({ payload: event.target.value })}
          rows={6}
          placeholder="Optional text passed to the next nodes as context…"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-950"
        />
      </label>
    </div>
  );
}

function AgentNodeInspector({
  node,
  onChange,
}: {
  node: AgentFlowNode;
  onChange: (node: FlowNode) => void;
}) {
  const data = node.data;
  const runtimeLabel = node.type === "open-code" ? "OpenCode" : "Claude Code";

  function patch(partial: Partial<AgentNodeData>) {
    onChange({
      ...node,
      data: { ...data, ...partial },
    });
  }

  function patchSecret(key: keyof AgentNodeData["secrets"], value: string) {
    onChange({
      ...node,
      data: {
        ...data,
        secrets: { ...data.secrets, [key]: value || undefined },
      },
    });
  }

  function togglePermission(permission: AgentNodeData["permissions"][number]) {
    const permissions = data.permissions.includes(permission)
      ? data.permissions.filter((item) => item !== permission)
      : [...data.permissions, permission];
    patch({ permissions });
  }

  function patchSkill(partial: Partial<AgentSkill>) {
    patch({
      skill: { ...data.skill, ...partial },
    });
  }

  function applySkillTemplate(templateId: string) {
    const template = SKILL_TEMPLATES.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    patch({ skill: { ...template.skill } });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        <span
          className={
            node.type === "open-code"
              ? "inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-500/10"
              : "inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#C15F3C]/10"
          }
        >
          <AgentRuntimeIcon
            runtime={node.type}
            className={
              node.type === "open-code"
                ? "h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100"
                : "h-3.5 w-3.5 text-[#C15F3C]"
            }
          />
        </span>
        <span>
          Runtime: <strong>{runtimeLabel}</strong>
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Label
        </span>
        <input
          value={data.label}
          onChange={(event) => patch({ label: event.target.value })}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
      </label>

      <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 dark:border-amber-500/30">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Skill
          </p>
          <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
            Repeatable automation instructions installed as{" "}
            <code className="rounded bg-amber-500/10 px-1">.cursor/skills/&lt;name&gt;/SKILL.md</code>{" "}
            in the sandbox before each run.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Template
          </span>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                applySkillTemplate(event.target.value);
                event.target.value = "";
              }
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">Load template…</option>
            {SKILL_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Skill name
          </span>
          <input
            value={data.skill.name}
            onChange={(event) =>
              patchSkill({ name: slugifySkillName(event.target.value) })
            }
            placeholder="pr-review"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Skill description
          </span>
          <input
            value={data.skill.description}
            onChange={(event) => patchSkill({ description: event.target.value })}
            placeholder="What this repeatable workflow does"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Skill instructions
          </span>
          <textarea
            value={data.skill.instructions}
            onChange={(event) => patchSkill({ instructions: event.target.value })}
            rows={8}
            placeholder="Markdown steps the agent follows every time this node runs…"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Task prompt
        </span>
        <textarea
          value={data.prompt}
          onChange={(event) => patch({ prompt: event.target.value })}
          rows={5}
          placeholder={`One-off task for this run (the skill defines the repeatable workflow)…`}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-950"
        />
      </label>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Permissions
        </p>
        <div className="space-y-2">
          {PERMISSIONS.map((permission) => (
            <label
              key={permission.id}
              className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={data.permissions.includes(permission.id)}
                onChange={() => togglePermission(permission.id)}
                className="mt-1"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {permission.id === "github" ? (
                    <GitHubIcon className="h-4 w-4" />
                  ) : null}
                  {permission.label}
                </span>
                <span className="block text-xs text-zinc-500">{permission.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          API keys
        </p>
        <SecretField
          label="Anthropic API key"
          value={data.secrets.anthropicApiKey}
          onChange={(value) => patchSecret("anthropicApiKey", value)}
          placeholder="sk-ant-… (optional if set on server)"
        />

        {data.permissions.includes("github") ? (
          <>
            <SecretField
              label="GitHub token"
              value={data.secrets.githubToken}
              onChange={(value) => patchSecret("githubToken", value)}
            />
            <SecretField
              label="GitHub repo URL"
              value={data.secrets.githubRepoUrl}
              onChange={(value) => patchSecret("githubRepoUrl", value)}
              placeholder="https://github.com/owner/repo"
            />
            <SecretField
              label="GitHub username (optional)"
              value={data.secrets.githubUser}
              onChange={(value) => patchSecret("githubUser", value)}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function StopNodeInspector({
  node,
  onChange,
}: {
  node: Extract<FlowNode, { type: "stop" }>;
  onChange: (node: FlowNode) => void;
}) {
  const data = node.data;

  function patch(partial: Partial<StopNodeData>) {
    onChange({
      ...node,
      data: { ...data, ...partial },
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-800 dark:text-red-200">
        When the flow reaches this node, execution stops and any downstream nodes
        are skipped.
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Label
        </span>
        <input
          value={data.label}
          onChange={(event) => patch({ label: event.target.value })}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
      </label>
    </div>
  );
}

export function NodeInspector({ node, onChange, onClose, onRemove }: NodeInspectorProps) {
  const header = (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Node inspector
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {node
            ? node.type === "manual-trigger"
              ? "Configure the Start node payload and label."
              : node.type === "stop"
                ? "Configure where the workflow should stop."
                : "Keys are sent with the run and scoped to this node's sandbox only."
            : "Select a node to configure triggers, agents, permissions, and API keys."}
        </p>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
          aria-label="Hide node inspector"
        >
          Hide
        </button>
      ) : null}
    </div>
  );

  if (!node) {
    return (
      <aside className="border-l border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
        {header}
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col border-l border-zinc-200 dark:border-zinc-800">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {header}

      {node.type === "manual-trigger" ? (
        <ManualTriggerInspector node={node} onChange={onChange} />
      ) : node.type === "stop" ? (
        <StopNodeInspector node={node} onChange={onChange} />
      ) : isAgentNode(node) ? (
        <AgentNodeInspector node={node as AgentFlowNode} onChange={onChange} />
      ) : null}
      </div>

      {onRemove ? (
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onRemove}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-500/10 dark:text-red-300"
          >
            Remove node
          </button>
        </div>
      ) : null}
    </aside>
  );
}
