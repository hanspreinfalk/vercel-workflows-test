import { Sandbox } from "@vercel/sandbox";
import {
  AgentConfigError,
  type AgentProgressEvent,
  type AgentRunResult,
  getClaudeSandboxEnv,
} from "@/lib/claude-agent";
import { SandboxConfigError } from "@/lib/run-in-sandbox";

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
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

export async function runClaudeAgent(
  prompt: string,
  onProgress: (event: AgentProgressEvent) => void
): Promise<AgentRunResult> {
  const startedAt = Date.now();
  let activeSandbox: Sandbox | undefined;

  try {
    const claudeEnv = getClaudeSandboxEnv();

    await runStep(onProgress, "sandbox", "Creating isolated microVM", async () => {
      activeSandbox = await Sandbox.create({
        runtime: "node24",
        resources: { vcpus: 4 },
        timeout: SANDBOX_TIMEOUT_MS,
        networkPolicy: "allow-all",
        persistent: false,
        tags: { demo: "claude-agent" },
      });
    });

    if (!activeSandbox) {
      throw new Error("Sandbox was not created");
    }

    const sandbox = activeSandbox;

    await runStep(
      onProgress,
      "install",
      "Installing Claude Code CLI",
      async () => {
        const install = await sandbox.runCommand({
          cmd: "npm",
          args: ["install", "-g", "@anthropic-ai/claude-code"],
          sudo: true,
          timeoutMs: 5 * 60 * 1000,
        });

        if ((install.exitCode ?? 1) !== 0) {
          const stderr = await install.stderr();
          throw new Error(stderr || "Failed to install Claude Code");
        }
      }
    );

    await runStep(
      onProgress,
      "workspace",
      "Preparing agent workspace",
      async () => {
        await sandbox.writeFiles([
          {
            path: "TASK.md",
            content: Buffer.from(
              `# Agent task\n\n${prompt}\n\nWork inside this directory. When finished, summarize what you did.`,
              "utf-8"
            ),
          },
        ]);
      }
    );

    let stdout = "";
    let stderr = "";

    await runStep(onProgress, "agent", "Running Claude Code agent", async () => {
      const result = await sandbox.runCommand({
        cmd: "claude",
        args: [
          "-p",
          prompt,
          "--output-format",
          "text",
          "--max-turns",
          "12",
          "--dangerously-skip-permissions",
        ],
        env: {
          ...claudeEnv,
          CI: "true",
        },
        timeoutMs: CLAUDE_COMMAND_TIMEOUT_MS,
      });

      stdout = await result.stdout();
      stderr = await result.stderr();

      if (stdout) {
        onProgress({ type: "log", stream: "stdout", text: stdout });
      }
      if (stderr) {
        onProgress({ type: "log", stream: "stderr", text: stderr });
      }

      if ((result.exitCode ?? 1) !== 0) {
        throw new Error(stderr || stdout || "Claude Code exited with an error");
      }
    });

    const agentResult: AgentRunResult = {
      sandboxId: sandbox.name,
      exitCode: 0,
      stdout,
      stderr,
      durationMs: Date.now() - startedAt,
    };

    onProgress({ type: "complete", ...agentResult });
    return agentResult;
  } catch (error) {
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

    throw error;
  } finally {
    if (activeSandbox) {
      try {
        await activeSandbox.stop();
      } catch {
        // Sandbox may already be stopped.
      }
    }
  }
}
