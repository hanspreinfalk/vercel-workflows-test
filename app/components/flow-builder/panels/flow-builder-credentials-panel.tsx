"use client";

import { useMemo } from "react";
import { KeyRound } from "lucide-react";
import {
  getCredentialLabel,
  getMissingFlowRequirements,
  getRequiredCredentialFieldsForNode,
  patchNodeSecret,
  type CredentialField,
} from "@/lib/flow/credentials";
import { isAgentNode } from "@/lib/agent/node-utils";
import type { FlowNode } from "@/lib/flow/types";

type FlowBuilderCredentialsPanelProps = {
  nodes: FlowNode[];
  onUpdateNode: (node: FlowNode) => void;
  onSelectNode: (nodeId: string) => void;
  className?: string;
};

export function FlowBuilderCredentialsPanel({
  nodes,
  onUpdateNode,
  onSelectNode,
  className = "",
}: FlowBuilderCredentialsPanelProps) {
  const issues = useMemo(() => getMissingFlowRequirements(nodes), [nodes]);
  const agentNodes = useMemo(() => nodes.filter(isAgentNode), [nodes]);

  if (agentNodes.length === 0) {
    return null;
  }

  const credentialIssues = issues.filter((issue) => issue.kind === "credential");
  const setupIssues = issues.filter((issue) => issue.kind !== "credential");

  return (
    <aside className={`flow-credentials-panel ${className}`.trim()}>
      <div className="flow-credentials-panel__header">
        <KeyRound className="size-4 text-[var(--brand)]" />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Credentials & readiness
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Required before any workflow run
          </p>
        </div>
        {issues.length === 0 ? (
          <span className="flow-credentials-panel__ready">Ready</span>
        ) : (
          <span className="flow-credentials-panel__blocked">
            {issues.length} missing
          </span>
        )}
      </div>

      {setupIssues.length > 0 ? (
        <ul className="flow-credentials-panel__issues">
          {setupIssues.map((issue) => (
            <li key={`${issue.nodeId}-${issue.kind}`}>
              <button
                type="button"
                onClick={() => onSelectNode(issue.nodeId)}
                className="text-left"
              >
                {issue.message}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flow-credentials-panel__nodes">
        {agentNodes.map((node) => {
          const fields = getRequiredCredentialFieldsForNode(node);
          return (
            <div key={node.id} className="flow-credentials-panel__node">
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                className="flow-credentials-panel__node-title"
              >
                {node.data.label}
              </button>
              <div className="space-y-2">
                {fields.map((field) => (
                  <CredentialFieldInput
                    key={field}
                    field={field}
                    label={getCredentialLabel(field)}
                    value={node.data.secrets[field] ?? ""}
                    onChange={(value) =>
                      onUpdateNode(patchNodeSecret(node, field, value))
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {credentialIssues.length > 0 && setupIssues.length === 0 ? (
        <p className="flow-credentials-panel__hint">
          Paste API keys above. The builder agent will run the workflow once
          everything is filled in.
        </p>
      ) : null}
    </aside>
  );
}

function CredentialFieldInput({
  field,
  label,
  value,
  onChange,
}: {
  field: CredentialField;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const isSecret = field.includes("Token") || field.includes("Key");

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
        {label}
      </span>
      <input
        type={isSecret ? "password" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          field === "githubRepoUrl"
            ? "https://github.com/org/repo"
            : `Enter ${label.toLowerCase()}`
        }
        className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--brand)_40%,var(--border))]"
        autoComplete="off"
      />
    </label>
  );
}
