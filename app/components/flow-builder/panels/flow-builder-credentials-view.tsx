"use client";

import { useMemo } from "react";
import { Bot, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import {
  getAgentCredentialSummaries,
  getCredentialFieldsForNode,
  getCredentialLabel,
  getMissingFlowRequirements,
  isCredentialFieldRequired,
  maskCredentialValue,
  patchNodeSecret,
} from "@/lib/flow/credentials";
import { isAgentNode } from "@/lib/agent/node-utils";
import type { FlowNode } from "@/lib/flow/types";
import { cn } from "@/lib/utils";
import { CredentialFieldInput } from "./credential-field-input";

type FlowBuilderCredentialsViewProps = {
  flowName: string;
  nodes: FlowNode[];
  onUpdateNode: (node: FlowNode) => void;
  onSelectNode: (nodeId: string) => void;
};

export function FlowBuilderCredentialsView({
  flowName,
  nodes,
  onUpdateNode,
  onSelectNode,
}: FlowBuilderCredentialsViewProps) {
  const agentNodes = useMemo(() => nodes.filter(isAgentNode), [nodes]);
  const summaries = useMemo(
    () => getAgentCredentialSummaries(nodes),
    [nodes]
  );
  const issues = useMemo(() => getMissingFlowRequirements(nodes), [nodes]);
  const credentialIssues = issues.filter((issue) => issue.kind === "credential");
  const setupIssues = issues.filter((issue) => issue.kind !== "credential");

  const readyAgents = summaries.filter((item) => item.isReady).length;
  const totalAgents = summaries.length;

  if (agentNodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <KeyRound className="size-8 text-[var(--text-tertiary)]" />
        <h2 className="text-lg font-medium text-[var(--text-primary)]">
          No agent nodes yet
        </h2>
        <p className="max-w-sm text-sm leading-snug text-[var(--text-secondary)]">
          Add Claude Code or OpenCode agents to this workflow, then configure
          credentials for each one here.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-10 sm:pt-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">{flowName}</p>
          <h1 className="mt-1 text-[1.375rem] font-medium tracking-tight text-[var(--text-primary)]">
            All credentials
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {totalAgents} agent{totalAgents === 1 ? "" : "s"} · {readyAgents}{" "}
            ready to run
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 py-2.5">
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {totalAgents}
            </span>
            <span className="text-[0.6875rem] text-[var(--text-tertiary)]">
              Agents
            </span>
          </div>
          <div className="flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 py-2.5">
            <span className="text-lg font-semibold text-[var(--brand)]">
              {readyAgents}
            </span>
            <span className="text-[0.6875rem] text-[var(--text-tertiary)]">
              Ready
            </span>
          </div>
          <div className="flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 py-2.5">
            <span
              className={cn(
                "text-lg font-semibold",
                credentialIssues.length > 0
                  ? "text-[var(--destructive)]"
                  : "text-[var(--text-primary)]"
              )}
            >
              {credentialIssues.length}
            </span>
            <span className="text-[0.6875rem] text-[var(--text-tertiary)]">
              Missing
            </span>
          </div>
        </div>
      </header>

      {setupIssues.length > 0 ? (
        <section className="mb-5 flex gap-3 rounded-lg border border-[color-mix(in_oklab,var(--destructive)_25%,var(--border))] bg-[var(--destructive-soft)] px-4 py-3.5 text-[0.8125rem] text-[var(--text-secondary)]">
          <ShieldAlert className="size-4 shrink-0" />
          <div>
            <p className="font-medium">Setup incomplete</p>
            <ul className="mt-1 space-y-1">
              {setupIssues.map((issue) => (
                <li key={`${issue.nodeId}-${issue.kind}`}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(issue.nodeId)}
                    className="text-left underline-offset-2 hover:underline"
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="mb-7">
        <h2 className="mb-3 text-[0.9375rem] font-medium text-[var(--text-primary)]">
          Overview
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]">
          <table className="w-full min-w-[36rem] border-collapse text-[0.8125rem]">
            <thead>
              <tr>
                <th className="border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Agent
                </th>
                <th className="border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Type
                </th>
                <th className="border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Anthropic
                </th>
                <th className="border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  GitHub
                </th>
                <th className="border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Repo
                </th>
                <th className="border-b border-[var(--border)] px-3.5 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => {
                const anthropic = summary.fields.find(
                  (f) => f.field === "anthropicApiKey"
                );
                const githubToken = summary.fields.find(
                  (f) => f.field === "githubToken"
                );
                const githubRepo = summary.fields.find(
                  (f) => f.field === "githubRepoUrl"
                );
                const hasGithub = summary.permissions.includes("github");

                return (
                  <tr key={summary.nodeId}>
                    <td className="border-b border-[var(--border)] px-3.5 py-2.5 align-middle last:border-b-0">
                      <button
                        type="button"
                        onClick={() => onSelectNode(summary.nodeId)}
                        className="font-medium text-[var(--text-primary)] transition-colors duration-[120ms] hover:text-[var(--brand)]"
                      >
                        {summary.nodeLabel}
                      </button>
                    </td>
                    <td className="border-b border-[var(--border)] px-3.5 py-2.5 align-middle text-[var(--text-tertiary)] last:border-b-0">
                      {summary.nodeType === "claude-code"
                        ? "Claude Code"
                        : "OpenCode"}
                    </td>
                    <td className="border-b border-[var(--border)] px-3.5 py-2.5 align-middle last:border-b-0">
                      <OverviewCell field={anthropic} />
                    </td>
                    <td className="border-b border-[var(--border)] px-3.5 py-2.5 align-middle last:border-b-0">
                      {hasGithub ? (
                        <OverviewCell field={githubToken} />
                      ) : (
                        <span className="text-[var(--text-tertiary)]">N/A</span>
                      )}
                    </td>
                    <td className="border-b border-[var(--border)] px-3.5 py-2.5 align-middle last:border-b-0">
                      {hasGithub ? (
                        <OverviewCell field={githubRepo} isUrl />
                      ) : (
                        <span className="text-[var(--text-tertiary)]">N/A</span>
                      )}
                    </td>
                    <td className="border-b border-[var(--border)] px-3.5 py-2.5 align-middle last:border-b-0">
                      {summary.isReady ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)]">
                          <CheckCircle2 className="size-3.5" />
                          Ready
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--destructive)]">
                          {summary.requiredCount - summary.configuredCount} missing
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[0.9375rem] font-medium text-[var(--text-primary)]">
          By agent
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {agentNodes.map((node) => {
            const summary = summaries.find((item) => item.nodeId === node.id);
            const fields = getCredentialFieldsForNode(node);

            return (
              <article
                key={node.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-[1.125rem] py-4"
              >
                <div className="mb-4 flex items-start gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[0.625rem] bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] text-[var(--brand)]">
                    <Bot className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectNode(node.id)}
                      className="block w-full text-left text-[0.9375rem] font-medium text-[var(--text-primary)] hover:text-[var(--brand)]"
                    >
                      {node.data.label}
                    </button>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {node.type === "claude-code" ? "Claude Code" : "OpenCode"}
                      {node.data.permissions.includes("github")
                        ? " · GitHub enabled"
                        : null}
                    </p>
                  </div>
                  {summary?.isReady ? (
                    <span className="shrink-0 rounded-full bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--brand)]">
                      Ready
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--text-tertiary)]">
                      Incomplete
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {fields.map((field) => (
                    <CredentialFieldInput
                      key={field}
                      field={field}
                      label={getCredentialLabel(field)}
                      required={isCredentialFieldRequired(node, field)}
                      value={node.data.secrets[field] ?? ""}
                      onChange={(value) =>
                        onUpdateNode(patchNodeSecret(node, field, value))
                      }
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function OverviewCell({
  field,
  isUrl = false,
}: {
  field?: { configured: boolean; value: string; isSecret: boolean };
  isUrl?: boolean;
}) {
  if (!field) {
    return <span className="text-[var(--text-tertiary)]">—</span>;
  }

  if (!field.configured) {
    return (
      <span className="text-xs text-[var(--destructive)]">Missing</span>
    );
  }

  const display = isUrl
    ? field.value
    : maskCredentialValue(field.value, field.isSecret);

  return (
    <span
      className="block max-w-40 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-[var(--text-secondary)]"
      title={display}
    >
      {display}
    </span>
  );
}
