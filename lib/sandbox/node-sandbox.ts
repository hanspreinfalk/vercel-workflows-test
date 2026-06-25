import type { Sandbox } from "@vercel/sandbox";
import {
  configureGithubGitAccess,
  configureGitIdentity,
  prepareGithubCli,
  SANDBOX_REPO_DIR,
} from "@/lib/sandbox/env";
import type { ClaudeNodeSecrets, NodePermission } from "@/lib/flow/types";

async function repoExists(sandbox: Sandbox) {
  const check = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", `test -d ${SANDBOX_REPO_DIR}/.git`],
  });
  return (check.exitCode ?? 1) === 0;
}

export async function prepareNodeSandbox(
  sandbox: Sandbox,
  params: {
    label: string;
    permissions: NodePermission[];
    secrets: ClaudeNodeSecrets;
  }
) {
  const guides: string[] = [`# Node: ${params.label}`, ""];

  if (params.permissions.includes("github")) {
    const token = params.secrets.githubToken?.trim();
    const repoUrl = params.secrets.githubRepoUrl?.trim();

    if (!token || !repoUrl) {
      throw new Error(
        `Node "${params.label}" requires GitHub access. Provide GitHub token and repo URL.`
      );
    }

    const username =
      params.secrets.githubUser?.trim() ??
      repoUrl.match(/github\.com[/:]([^/]+)/i)?.[1] ??
      "github-user";

    await configureGithubGitAccess(sandbox, token);
    await configureGitIdentity(
      sandbox,
      username,
      `${username}@users.noreply.github.com`
    );
    await prepareGithubCli(sandbox, token);

    if (!(await repoExists(sandbox))) {
      const cloneUrl = repoUrl.endsWith(".git") ? repoUrl : `${repoUrl}.git`;
      const clone = await sandbox.runCommand({
        cmd: "git",
        args: ["clone", cloneUrl, SANDBOX_REPO_DIR],
      });
      if ((clone.exitCode ?? 1) !== 0) {
        throw new Error(
          (await clone.stderr()) || "Failed to clone GitHub repository"
        );
      }
    }

    guides.push(
      "## GitHub access",
      `- Repo cloned at ./${SANDBOX_REPO_DIR}/`,
      "- GitHub CLI (`gh`) is installed and authenticated",
      "- Git credentials are configured for HTTPS",
      "- Prefer `gh` for PRs, issues, and API queries; use git for local repo history"
    );
  }

  if (guides.length > 2) {
    await sandbox.writeFiles([
      {
        path: "CLAUDE.md",
        content: Buffer.from(guides.join("\n"), "utf-8"),
      },
    ]);
  }
}

export async function getNodeSandboxCwd(
  sandbox: Sandbox,
  permissions: NodePermission[]
) {
  if (permissions.includes("github") && (await repoExists(sandbox))) {
    return `${sandbox.cwd}/${SANDBOX_REPO_DIR}`;
  }
  return undefined;
}

export function buildClaudeEnvForNode(secrets: ClaudeNodeSecrets) {
  const env: Record<string, string> = { CI: "true" };

  if (secrets.anthropicApiKey?.trim()) {
    env.ANTHROPIC_API_KEY = secrets.anthropicApiKey.trim();
  }

  return env;
}

export function mergeClaudeEnv(
  nodeEnv: Record<string, string>,
  serverEnv: Record<string, string>
) {
  return {
    ...serverEnv,
    ...nodeEnv,
    ...(nodeEnv.ANTHROPIC_API_KEY
      ? { ANTHROPIC_API_KEY: nodeEnv.ANTHROPIC_API_KEY }
      : {}),
  };
}
