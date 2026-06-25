"use client";

import { GitHubIcon } from "@/app/components/icons/github-icon";
import type { AgentNodeDataWithRun } from "@/lib/agent/node-utils";
import { getSkillDisplayName } from "@/lib/agent/skills";

export function AgentNodeBadges({
  permissions,
  skill,
}: {
  permissions: AgentNodeDataWithRun["permissions"];
  skill?: AgentNodeDataWithRun["skill"];
}) {
  const skillName = skill ? getSkillDisplayName(skill) : null;

  return (
    <>
      {skillName ? (
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
          skill:{skillName}
        </span>
      ) : null}
      {permissions.length === 0 ? (
        !skillName ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            sandbox only
          </span>
        ) : null
      ) : (
        permissions.map((permission) =>
          permission === "github" ? (
            <span
              key={permission}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              <GitHubIcon className="h-3 w-3" />
              GitHub
            </span>
          ) : (
            <span
              key={permission}
              className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-300"
            >
              {permission}
            </span>
          )
        )
      )}
    </>
  );
}

export function AgentNodeRunStatus({
  runStatus,
}: {
  runStatus?: AgentNodeDataWithRun["runStatus"];
}) {
  if (runStatus === "started") {
    return (
      <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">Running…</p>
    );
  }
  if (runStatus === "failed") {
    return (
      <p className="mt-2 text-xs text-red-600 dark:text-red-400">Failed</p>
    );
  }
  return null;
}
