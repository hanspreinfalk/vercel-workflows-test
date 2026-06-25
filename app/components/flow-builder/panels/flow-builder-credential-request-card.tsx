"use client";

import { useMemo, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import {
  getCredentialLabel,
  patchNodeSecret,
  resolveCredentialRequest,
  type CredentialField,
  type CredentialRequestPayload,
} from "@/lib/flow/credentials";
import { isAgentNode } from "@/lib/agent/node-utils";
import type { FlowNode } from "@/lib/flow/types";
import { cn } from "@/lib/utils";

type FlowBuilderCredentialRequestCardProps = {
  request: CredentialRequestPayload;
  nodes: FlowNode[];
  status: "pending" | "completed" | "skipped";
  savedFields?: CredentialField[];
  onSave: (params: {
    nodeId: string;
    fields: CredentialField[];
    nodes: FlowNode[];
  }) => void;
  onSkip?: () => void;
  disabled?: boolean;
};

function isSecretField(field: CredentialField): boolean {
  return field.includes("Token") || field.includes("Key");
}

export function FlowBuilderCredentialRequestCard({
  request,
  nodes,
  status,
  savedFields = [],
  onSave,
  onSkip,
  disabled = false,
}: FlowBuilderCredentialRequestCardProps) {
  const resolved = useMemo(
    () => resolveCredentialRequest(nodes, request),
    [nodes, request]
  );

  const [values, setValues] = useState<Partial<Record<CredentialField, string>>>(
    () => {
      if (!resolved) {
        return {};
      }

      const node = nodes.find((item) => item.id === resolved.nodeId);
      if (!node || !isAgentNode(node)) {
        return {};
      }

      return Object.fromEntries(
        resolved.fields.map((field) => [field, node.data.secrets[field] ?? ""])
      ) as Partial<Record<CredentialField, string>>;
    }
  );

  if (!resolved) {
    return (
      <div className="w-full rounded-xl border border-[color-mix(in_oklab,var(--destructive)_35%,var(--border))] bg-[var(--destructive-soft)] px-4 py-3.5">
        <p className="text-sm text-[var(--destructive)]">
          Could not find an agent node for this credential request.
        </p>
      </div>
    );
  }

  const isComplete = status === "completed";
  const canSubmit =
    !disabled && resolved.fields.some((field) => values[field]?.trim());

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!resolved || !canSubmit || isComplete) {
      return;
    }

    let nextNodes = nodes;
    const saved: CredentialField[] = [];

    for (const field of resolved.fields) {
      const value = values[field]?.trim();
      if (!value) {
        continue;
      }

      nextNodes = nextNodes.map((node) =>
        node.id === resolved.nodeId ? patchNodeSecret(node, field, value) : node
      );
      saved.push(field);
    }

    if (saved.length === 0) {
      return;
    }

    onSave({
      nodeId: resolved.nodeId,
      fields: saved,
      nodes: nextNodes,
    });
  }

  return (
    <form
      className={cn(
        "w-full rounded-xl border border-[color-mix(in_oklab,var(--brand)_28%,var(--border))] bg-[color-mix(in_oklab,var(--brand)_6%,var(--surface-elevated))] px-[1.125rem] py-4",
        isComplete &&
          "border-[color-mix(in_oklab,var(--brand)_35%,var(--border))]"
      )}
      onSubmit={handleSubmit}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_12%,transparent)]">
          {isComplete ? (
            <ShieldCheck className="size-4 text-[var(--brand)]" />
          ) : (
            <KeyRound className="size-4 text-[var(--brand)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {isComplete ? "Credentials saved securely" : "Secure credential input"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {resolved.nodeLabel}
            {request.reason ? ` · ${request.reason}` : null}
          </p>
        </div>
      </div>

      {!isComplete ? (
        <>
          <p className="mt-3 text-xs leading-normal text-[var(--text-tertiary)]">
            Values are stored locally on this device for workflow runs. They are
            never sent to the AI assistant or included in chat history.
          </p>

          {disabled ? (
            <p className="mt-3 text-xs leading-normal text-[var(--text-tertiary)]">
              Waiting for the assistant to finish responding…
            </p>
          ) : null}

          <div className="mt-3.5 flex flex-col gap-2.5">
            {resolved.fields.map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-[0.6875rem] font-medium text-[var(--text-tertiary)]">
                  {getCredentialLabel(field)}
                </span>
                <input
                  type={isSecretField(field) ? "password" : "text"}
                  value={values[field] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  placeholder={
                    field === "githubRepoUrl"
                      ? "https://github.com/org/repo"
                      : `Enter ${getCredentialLabel(field).toLowerCase()}`
                  }
                  className="rounded-[0.625rem] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:border-[color-mix(in_oklab,var(--brand)_45%,var(--border))] disabled:opacity-60"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={disabled}
                />
              </label>
            ))}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="workspace-btn-primary rounded-full px-4 py-2 text-xs font-medium disabled:opacity-50"
            >
              Save securely
            </button>
            {onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                className="workspace-btn-ghost rounded-full px-3 py-2 text-xs"
              >
                Skip for now
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5 text-[0.8125rem] text-[var(--text-secondary)]">
          {(savedFields.length > 0 ? savedFields : resolved.fields).map(
            (field) => (
              <li key={field} className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-[var(--brand)]" />
                {getCredentialLabel(field)} configured
              </li>
            )
          )}
        </ul>
      )}
    </form>
  );
}
