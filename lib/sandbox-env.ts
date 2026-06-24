import type { Sandbox } from "@vercel/sandbox";

const GIT_CREDENTIALS_PATH = "/vercel/sandbox/.git-credentials";
export const SANDBOX_REPO_DIR = "repo";

export function getGithubToken(): string | undefined {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
}

export function getGithubRepoUrl(): string | undefined {
  return process.env.GITHUB_REPO_URL;
}

export function getGithubUsername(): string | undefined {
  return process.env.GITHUB_USER ?? process.env.GITHUB_USERNAME;
}

export function getGithubEmail(): string | undefined {
  return process.env.GITHUB_EMAIL;
}

export function getSecretsToRedact(): string[] {
  const token = getGithubToken();
  return token ? [token] : [];
}

export type GithubWorkspaceContext = {
  token: string;
  repoUrl: string;
  username: string;
  email: string;
};

async function runGitCommand(sandbox: Sandbox, args: string[]) {
  const result = await sandbox.runCommand({
    cmd: "git",
    args,
  });

  if ((result.exitCode ?? 1) !== 0) {
    const stderr = await result.stderr();
    throw new Error(stderr || "Git command failed");
  }
}

function parseOwnerFromRepoUrl(repoUrl: string): string | undefined {
  const match = repoUrl.match(/github\.com[/:]([^/]+)/i);
  return match?.[1];
}

async function fetchGithubUsername(token: string): Promise<string | undefined> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "my-workflow-app",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as { login?: string };
    return data.login;
  } catch {
    return undefined;
  }
}

export async function resolveGithubWorkspaceContext(): Promise<GithubWorkspaceContext | null> {
  const token = getGithubToken();
  const repoUrl = getGithubRepoUrl();

  if (!token || !repoUrl) {
    return null;
  }

  const username =
    getGithubUsername() ??
    parseOwnerFromRepoUrl(repoUrl) ??
    (await fetchGithubUsername(token));

  if (!username) {
    throw new Error(
      "Could not resolve GitHub username. Set GITHUB_USER in .env.local."
    );
  }

  const email =
    getGithubEmail() ?? `${username}@users.noreply.github.com`;

  return { token, repoUrl, username, email };
}

export async function configureGithubGitAccess(sandbox: Sandbox, token: string) {
  await sandbox.writeFiles([
    {
      path: ".git-credentials",
      content: Buffer.from(
        `https://x-access-token:${token}@github.com\n`,
        "utf-8"
      ),
      mode: 0o600,
    },
  ]);

  await runGitCommand(sandbox, [
    "config",
    "--global",
    "credential.helper",
    `store --file ${GIT_CREDENTIALS_PATH}`,
  ]);
}

export async function configureGitIdentity(
  sandbox: Sandbox,
  username: string,
  email: string
) {
  await runGitCommand(sandbox, ["config", "--global", "user.name", username]);
  await runGitCommand(sandbox, ["config", "--global", "user.email", email]);
}

export async function cloneGithubRepo(sandbox: Sandbox, repoUrl: string) {
  const cloneUrl = repoUrl.endsWith(".git") ? repoUrl : `${repoUrl}.git`;
  await runGitCommand(sandbox, ["clone", cloneUrl, SANDBOX_REPO_DIR]);
}

async function repoExists(sandbox: Sandbox) {
  const checkRepo = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", `test -d ${SANDBOX_REPO_DIR}/.git`],
  });

  return (checkRepo.exitCode ?? 1) === 0;
}

export async function ensureGithubRepo(
  sandbox: Sandbox,
  context: GithubWorkspaceContext
) {
  if (await repoExists(sandbox)) {
    return;
  }

  await cloneGithubRepo(sandbox, context.repoUrl);
}

export async function writeWorkspaceGuide(
  sandbox: Sandbox,
  context: GithubWorkspaceContext
) {
  const repoName = context.repoUrl.replace(/\.git$/, "").split("/").pop();

  await sandbox.writeFiles([
    {
      path: "CLAUDE.md",
      content: Buffer.from(
        `# Sandbox workspace

This sandbox is preconfigured for GitHub.

- Project repo: \`./${SANDBOX_REPO_DIR}/\` (${repoName ?? "GitHub repo"})
- GitHub user: ${context.username}
- Git identity and HTTPS credentials are already configured
- Use \`git log\`, \`git fetch\`, and \`git pull\` from \`./${SANDBOX_REPO_DIR}/\`

You are already inside the cloned repo when running commands here. Do not ask the user for their GitHub username unless git operations fail.
`,
        "utf-8"
      ),
    },
  ]);
}

export async function prepareGithubWorkspace(
  sandbox: Sandbox
): Promise<GithubWorkspaceContext | null> {
  const token = getGithubToken();
  if (!token) {
    return null;
  }

  const repoUrl = getGithubRepoUrl();
  if (!repoUrl) {
    throw new Error(
      "GITHUB_TOKEN is set but GITHUB_REPO_URL is missing. Add GITHUB_REPO_URL=https://github.com/owner/repo to .env.local."
    );
  }

  const context = await resolveGithubWorkspaceContext();
  if (!context) {
    return null;
  }

  await configureGithubGitAccess(sandbox, context.token);
  await configureGitIdentity(sandbox, context.username, context.email);
  await ensureGithubRepo(sandbox, context);
  await writeWorkspaceGuide(sandbox, context);

  return context;
}

export async function getSandboxRepoCwd(
  sandbox: Sandbox
): Promise<string | undefined> {
  if (await repoExists(sandbox)) {
    return `${sandbox.cwd}/${SANDBOX_REPO_DIR}`;
  }

  return undefined;
}
