import { Sandbox } from "@vercel/sandbox";
import {
  appendAssistantMessage,
  appendUserMessage,
  createAgentSession,
  getAgentSession,
  markSessionStopped,
  type AgentSession,
} from "@/lib/agent-session-store";
import {
  AgentConfigError,
  getClaudeSandboxEnv,
  makeSessionTitle,
  type AgentProgressEvent,
  toSessionSummary,
} from "@/lib/claude-agent";
import {
  ClaudeStreamParser,
  streamEventToActivity,
  type AgentActivityItem,
} from "@/lib/claude-stream-parser";
import { redactSecrets } from "@/lib/redact-secrets";
import { SandboxConfigError } from "@/lib/run-in-sandbox";
import {
  getGithubToken,
  getSandboxRepoCwd,
  prepareGithubWorkspace,
  getSecretsToRedact,
} from "@/lib/sandbox-env";

const SANDBOX_TIMEOUT_MS = 30 * 60 * 1000;
const SANDBOX_EXTEND_MS = 15 * 60 * 1000;
const CLAUDE_COMMAND_TIMEOUT_MS = 8 * 60 * 1000;

async function runStep(
  onProgress: (event: AgentProgressEvent) => void,
  step: string,
  message: string,
  action: () => Promise<void>
) {
  const startedAt = Date.now();
  onProgress({ type: "step", step, status: "started", message });

  try {
    await action();
    onProgress({
      type: "step",
      step,
      status: "completed",
      message,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    onProgress({
      type: "step",
      step,
      status: "failed",
      message: error instanceof Error ? error.message : "Step failed",
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

async function installClaudeCode(sandbox: Sandbox, sanitize: (text: string) => string) {
  const install = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "-g", "@anthropic-ai/claude-code"],
    sudo: true,
    timeoutMs: 5 * 60 * 1000,
  });

  if ((install.exitCode ?? 1) !== 0) {
    throw new Error(sanitize(await install.stderr()) || "Failed to install Claude Code");
  }
}

async function ensureClaudeInstalled(sandbox: Sandbox, sanitize: (text: string) => string) {
  const check = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", "command -v claude"],
  });

  if ((check.exitCode ?? 1) !== 0) {
    await installClaudeCode(sandbox, sanitize);
  }
}

async function prepareWorkspace(
  sandbox: Sandbox,
  onProgress: (event: AgentProgressEvent) => void
) {
  if (!getGithubToken()) {
    return;
  }

  await runStep(onProgress, "github", "Preparing GitHub workspace", async () => {
    await prepareGithubWorkspace(sandbox);
  });
}

async function getOrCreateSandbox(
  sandboxName: string,
  onProgress: (event: AgentProgressEvent) => void,
  sanitize: (text: string) => string
) {
  let created = false;

  const sandbox = await Sandbox.getOrCreate({
    name: sandboxName,
    runtime: "node24",
    resources: { vcpus: 4 },
    timeout: SANDBOX_TIMEOUT_MS,
    networkPolicy: "allow-all",
    persistent: true,
    tags: { demo: "claude-agent-chat" },
    onCreate: async (sbx) => {
      created = true;
      await installClaudeCode(sbx, sanitize);
      await prepareWorkspace(sbx, onProgress);
    },
  });

  onProgress({
    type: "step",
    step: "sandbox",
    status: "completed",
    message: created ? "Created sandbox" : "Resumed sandbox",
  });

  await sandbox.extendTimeout(SANDBOX_EXTEND_MS);
  await ensureClaudeInstalled(sandbox, sanitize);

  if (!created) {
    await prepareWorkspace(sandbox, onProgress);
  }

  return sandbox;
}

const CLAUDE_STREAM_FLAGS = [
  "--output-format",
  "stream-json",
  "--verbose",
  "--include-partial-messages",
  "--max-thinking-tokens",
  "8192",
  "--max-turns",
  "12",
  "--dangerously-skip-permissions",
];

function finalizeActivity(activity: AgentActivityItem[]) {
  return activity.map((item) =>
    item.status === "running" ? { ...item, status: "done" as const } : item
  );
}

function emitActivitySnapshot(
  onProgress: (event: AgentProgressEvent) => void,
  activity: AgentActivityItem[],
  streamingText: string
) {
  onProgress({
    type: "activity_snapshot",
    activity,
    streamingText,
  });
}

async function runClaudeMessage(params: {
  sandbox: Sandbox;
  claudeSessionName: string;
  prompt: string;
  isFirstMessage: boolean;
  sanitize: (text: string) => string;
  onProgress: (event: AgentProgressEvent) => void;
}) {
  const claudeEnv = getClaudeSandboxEnv();

  const args = params.isFirstMessage
    ? [
        "-p",
        params.prompt,
        "--name",
        params.claudeSessionName,
        ...CLAUDE_STREAM_FLAGS,
      ]
    : [
        "-r",
        params.claudeSessionName,
        "-p",
        params.prompt,
        ...CLAUDE_STREAM_FLAGS,
      ];

  let activity: AgentActivityItem[] = [];
  const parser = new ClaudeStreamParser({
    onEvent: (event) => {
      activity = streamEventToActivity(event, activity);
      if (
        event.kind === "text_delta" ||
        event.kind === "tool_start" ||
        event.kind === "result"
      ) {
        activity = activity.map((item) =>
          item.kind === "thinking" && item.status === "running"
            ? { ...item, status: "done" }
            : item
        );
      }

      params.onProgress({ type: "agent_event", event });
      emitActivitySnapshot(
        params.onProgress,
        activity,
        parser.getFinalText()
      );
    },
  });

  const repoCwd = await getSandboxRepoCwd(params.sandbox);

  const cmd = await params.sandbox.runCommand({
    cmd: "claude",
    args,
    cwd: repoCwd,
    env: {
      ...claudeEnv,
      CI: "true",
    },
    detached: true,
    timeoutMs: CLAUDE_COMMAND_TIMEOUT_MS,
  });

  let lineBuffer = "";
  for await (const log of cmd.logs()) {
    const text = params.sanitize(log.data);
    if (log.stream === "stderr") {
      if (text.trim()) {
        params.onProgress({ type: "log", stream: "stderr", text });
      }
      continue;
    }

    lineBuffer += text;
    let newlineIndex = lineBuffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = lineBuffer.slice(0, newlineIndex).trim();
      lineBuffer = lineBuffer.slice(newlineIndex + 1);
      if (line) {
        parser.handleLine(line);
      }
      newlineIndex = lineBuffer.indexOf("\n");
    }
  }

  const trailingLine = lineBuffer.trim();
  if (trailingLine) {
    parser.handleLine(trailingLine);
  }

  const result = await cmd.wait();
  const finalText = parser.getFinalText();
  const thinking = parser.getThinkingText();
  activity = finalizeActivity(activity);

  emitActivitySnapshot(params.onProgress, activity, finalText);

  if ((result.exitCode ?? 1) !== 0) {
    const stderr = params.sanitize(await result.stderr());
    throw new Error(stderr || finalText || "Claude Code exited with an error");
  }

  params.onProgress({ type: "assistant_message", content: finalText });
  return { text: finalText, activity, thinking };
}

function formatAgentError(error: unknown, sanitize: (text: string) => string): string {
  if (error instanceof Error) {
    const apiError = error as Error & {
      json?: { error?: { message?: string } };
    };
    const apiMessage = apiError.json?.error?.message;
    if (apiMessage) {
      return sanitize(apiMessage);
    }
    return sanitize(error.message);
  }

  return "Agent execution failed";
}

function wrapAgentError(error: unknown, sanitize: (text: string) => string): never {
  if (error instanceof AgentConfigError) {
    throw error;
  }

  if (
    error instanceof Error &&
    (error.name === "LocalOidcContextError" ||
      error.name === "VercelOidcContextError" ||
      error.message.includes("Could not get credentials"))
  ) {
    throw new SandboxConfigError(
      "Sandbox credentials are missing. Run `vercel link` and `vercel env pull`, then restart the dev server."
    );
  }

  if (error instanceof Error) {
    throw new Error(formatAgentError(error, sanitize));
  }

  throw error;
}

export async function startAgentSession(
  prompt: string,
  onProgress: (event: AgentProgressEvent) => void
): Promise<AgentSession> {
  const startedAt = Date.now();
  const secretsToRedact = getSecretsToRedact();
  const sanitize = (text: string) => redactSecrets(text, secretsToRedact);

  const sessionId = crypto.randomUUID();
  const sandboxName = `agent-chat-${sessionId}`;
  const claudeSessionName = `chat-${sessionId.slice(0, 8)}`;

  try {
    onProgress({
      type: "step",
      step: "sandbox",
      status: "started",
      message: "Creating sandbox",
    });

    const sandbox = await getOrCreateSandbox(sandboxName, onProgress, sanitize);
    const session = createAgentSession({
      id: sessionId,
      sandboxName,
      claudeSessionName,
      title: makeSessionTitle(prompt),
      userMessage: prompt,
    });

    onProgress({ type: "session", session: toSessionSummary(session) });

    await runStep(onProgress, "agent", "Running Claude Code", async () => {
      const assistantReply = await runClaudeMessage({
        sandbox,
        claudeSessionName,
        prompt,
        isFirstMessage: true,
        sanitize,
        onProgress,
      });
      appendAssistantMessage(session.id, assistantReply.text, {
        activity: assistantReply.activity,
        thinking: assistantReply.thinking || undefined,
      });
    });

    onProgress({
      type: "complete",
      sessionId: session.id,
      sandboxId: sandbox.name,
      durationMs: Date.now() - startedAt,
    });

    return getAgentSession(session.id)!;
  } catch (error) {
    wrapAgentError(error, sanitize);
  }
}

export async function continueAgentSession(
  sessionId: string,
  prompt: string,
  onProgress: (event: AgentProgressEvent) => void
): Promise<AgentSession> {
  const startedAt = Date.now();
  const secretsToRedact = getSecretsToRedact();
  const sanitize = (text: string) => redactSecrets(text, secretsToRedact);

  const existing = getAgentSession(sessionId);
  if (!existing) {
    throw new Error("Session not found");
  }
  if (existing.status === "stopped") {
    throw new Error("Session is stopped. Start a new conversation instead.");
  }

  appendUserMessage(sessionId, prompt);
  onProgress({ type: "session", session: toSessionSummary(existing) });

  try {
    onProgress({
      type: "step",
      step: "sandbox",
      status: "started",
      message: "Resuming sandbox",
    });

    const sandbox = await getOrCreateSandbox(
      existing.sandboxName,
      onProgress,
      sanitize
    );

    await runStep(onProgress, "agent", "Running Claude Code", async () => {
      const assistantReply = await runClaudeMessage({
        sandbox,
        claudeSessionName: existing.claudeSessionName,
        prompt,
        isFirstMessage: false,
        sanitize,
        onProgress,
      });
      appendAssistantMessage(sessionId, assistantReply.text, {
        activity: assistantReply.activity,
        thinking: assistantReply.thinking || undefined,
      });
    });

    onProgress({
      type: "complete",
      sessionId,
      sandboxId: sandbox.name,
      durationMs: Date.now() - startedAt,
    });

    return getAgentSession(sessionId)!;
  } catch (error) {
    wrapAgentError(error, sanitize);
  }
}

export async function stopAgentSession(sessionId: string) {
  const session = getAgentSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  try {
    const sandbox = await Sandbox.get({ name: session.sandboxName });
    await sandbox.stop();
  } catch {
    // Sandbox may already be stopped.
  }

  markSessionStopped(sessionId);
}
