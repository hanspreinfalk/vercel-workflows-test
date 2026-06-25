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

const GH_CLI_VERSION = "2.63.2";

export async function installGithubCli(sandbox: Sandbox) {
  const check = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", "command -v gh"],
  });

  if ((check.exitCode ?? 1) === 0) {
    return;
  }

  const install = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      [
        "set -euo pipefail",
        `GH_VERSION="${GH_CLI_VERSION}"`,
        'ARCH="$(uname -m)"',
        'case "$ARCH" in',
        '  x86_64|amd64) GH_ARCH="amd64" ;;',
        '  aarch64|arm64) GH_ARCH="arm64" ;;',
        '  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;',
        "esac",
        'URL="https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${GH_ARCH}.tar.gz"',
        'EXTRACT_DIR="/tmp/gh_${GH_VERSION}_linux_${GH_ARCH}"',
        'rm -rf "$EXTRACT_DIR" /tmp/gh.tgz',
        'if command -v curl >/dev/null 2>&1; then',
        '  curl -fsSL "$URL" -o /tmp/gh.tgz',
        'elif command -v wget >/dev/null 2>&1; then',
        '  wget -q "$URL" -O /tmp/gh.tgz',
        "else",
        '  echo "Need curl or wget to install GitHub CLI"; exit 1',
        "fi",
        'tar -xzf /tmp/gh.tgz -C /tmp',
        'test -x "$EXTRACT_DIR/bin/gh"',
        'install -m 755 "$EXTRACT_DIR/bin/gh" /usr/local/bin/gh',
        'rm -rf "$EXTRACT_DIR" /tmp/gh.tgz',
        "gh --version",
      ].join("\n"),
    ],
    sudo: true,
    timeoutMs: 5 * 60 * 1000,
  });

  if ((install.exitCode ?? 1) !== 0) {
    throw new Error((await install.stderr()) || "Failed to install GitHub CLI");
  }
}

export async function configureGithubCliAuth(sandbox: Sandbox, token: string) {
  const auth = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", 'printf %s "$GH_TOKEN" | gh auth login --with-token'],
    env: { GH_TOKEN: token },
    timeoutMs: 60_000,
  });

  if ((auth.exitCode ?? 1) !== 0) {
    throw new Error(
      (await auth.stderr()) || "Failed to authenticate GitHub CLI"
    );
  }
}

export async function prepareGithubCli(sandbox: Sandbox, token: string) {
  await installGithubCli(sandbox);
  await configureGithubCliAuth(sandbox, token);
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
- GitHub CLI (\`gh\`) is installed and authenticated — prefer \`gh repo view\`, \`gh pr list\`, \`gh api\`, etc.
- Use \`git log\`, \`git fetch\`, and \`git pull\` from \`./${SANDBOX_REPO_DIR}/\`

You are already inside the cloned repo when running commands here. Do not ask the user for their GitHub username unless git or gh operations fail.
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
  await prepareGithubCli(sandbox, context.token);
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
