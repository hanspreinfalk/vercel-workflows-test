import { FatalError } from "workflow";
import { Sandbox } from "@vercel/sandbox";
import type { AgentFlowNode } from "@/lib/agent/node-utils";
import { getClaudeSandboxEnv } from "@/lib/agent/claude-agent";
import { redactSecrets } from "@/lib/sandbox/redact-secrets";
import {
  getFlowSandboxName,
  isFlowRunCancelled,
} from "@/lib/flow/run-state";
import { registerFlowRunSandboxWithPersistence } from "@/lib/flow/run-cancel";
import {
  buildClaudeEnvForNode,
  getNodeSandboxCwd,
  mergeClaudeEnv,
  prepareNodeSandbox,
} from "@/lib/sandbox/node-sandbox";
import {
  installAgentSkill,
  runAgentSkillScript,
  skillPromptPrefix,
} from "@/lib/agent/skills";

const SANDBOX_TIMEOUT_MS = 20 * 60 * 1000;
const AGENT_COMMAND_TIMEOUT_MS = 8 * 60 * 1000;

function formatSandboxError(error: unknown): string {
  if (error instanceof Error) {
    const apiError = error as Error & {
      json?: { error?: { message?: string } };
    };
    const apiMessage = apiError.json?.error?.message;
    if (apiMessage) {
      return apiMessage;
    }
    return error.message;
  }
  return "Sandbox error";
}

async function installClaudeCode(sandbox: Sandbox) {
  const check = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", "command -v claude"],
  });

  if ((check.exitCode ?? 1) === 0) {
    return;
  }

  const install = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "-g", "@anthropic-ai/claude-code"],
    sudo: true,
    timeoutMs: 5 * 60 * 1000,
  });

  if ((install.exitCode ?? 1) !== 0) {
    throw new Error((await install.stderr()) || "Failed to install Claude Code");
  }
}

async function installOpenCode(sandbox: Sandbox) {
  const check = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", "command -v opencode"],
  });

  if ((check.exitCode ?? 1) === 0) {
    return;
  }

  const install = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "-g", "opencode-ai"],
    sudo: true,
    timeoutMs: 5 * 60 * 1000,
  });

  if ((install.exitCode ?? 1) !== 0) {
    throw new Error((await install.stderr()) || "Failed to install OpenCode");
  }
}

async function stopSandbox(sandbox: Sandbox | undefined) {
  if (!sandbox) return;
  try {
    await sandbox.stop();
  } catch {
    // Sandbox may already be stopped.
  }
}

function throwIfCancelled(runId: string) {
  if (isFlowRunCancelled(runId)) {
    throw new FatalError("Run cancelled by user");
  }
}

function hasLlmApiKey(env: Record<string, string>) {
  return (
    Boolean(env.ANTHROPIC_API_KEY) ||
    Boolean(env.ANTHROPIC_AUTH_TOKEN) ||
    Boolean(env.OPENAI_API_KEY)
  );
}

export async function runAgentNode(params: {
  node: AgentFlowNode;
  prompt: string;
  runId: string;
  secretsToRedact: string[];
}) {
  const { node, prompt, runId, secretsToRedact } = params;
  const sanitize = (text: string) => redactSecrets(text, secretsToRedact);
  const runtimeLabel = node.type === "open-code" ? "OpenCode" : "Claude Code";

  throwIfCancelled(runId);

  const sandboxName = getFlowSandboxName(runId, node.id);
  registerFlowRunSandboxWithPersistence(runId, sandboxName);

  let sandbox: Sandbox | undefined;

  try {
    sandbox = await Sandbox.create({
      name: sandboxName,
      runtime: "node24",
      resources: { vcpus: 4 },
      timeout: SANDBOX_TIMEOUT_MS,
      networkPolicy: "allow-all",
      persistent: false,
      tags: { demo: "flow-builder-node", flowRunId: runId.slice(0, 36) },
    });

    throwIfCancelled(runId);

    if (node.type === "open-code") {
      await installOpenCode(sandbox);
    } else {
      await installClaudeCode(sandbox);
    }

    throwIfCancelled(runId);

    await prepareNodeSandbox(sandbox, {
      label: node.data.label,
      permissions: node.data.permissions,
      secrets: node.data.secrets,
    });

    throwIfCancelled(runId);

    await installAgentSkill(sandbox, node.data.skill);

    const cwd =
      (await getNodeSandboxCwd(sandbox, node.data.permissions)) ?? sandbox.cwd;

    const scriptResult = await runAgentSkillScript(
      sandbox,
      node.data.skill,
      cwd
    );
    if (scriptResult.exitCode !== 0) {
      throw new Error(
        sanitize(
          scriptResult.stderr ||
            scriptResult.stdout ||
            `Skill script failed for "${node.data.label}"`
        )
      );
    }

    const scriptContext = scriptResult.stdout.trim()
      ? `\n\nSkill script output:\n${sanitize(scriptResult.stdout.trim())}\n\n`
      : "";

    const agentPrompt =
      `${skillPromptPrefix(node.data.skill)}${scriptContext}${prompt}`.trim();

    throwIfCancelled(runId);

    const nodeEnv = buildClaudeEnvForNode(node.data.secrets);
    const serverEnv = getClaudeSandboxEnv();
    const agentEnv = mergeClaudeEnv(nodeEnv, serverEnv);

    if (!hasLlmApiKey(agentEnv)) {
      throw new Error(
        `Node "${node.data.label}" needs an LLM API key (Anthropic/OpenAI via node secret or server env).`
      );
    }

    const result =
      node.type === "open-code"
        ? await sandbox.runCommand({
            cmd: "opencode",
            args: [
              "run",
              "--agent",
              "build",
              "--dangerously-skip-permissions",
              agentPrompt,
            ],
            cwd,
            env: agentEnv,
            timeoutMs: AGENT_COMMAND_TIMEOUT_MS,
          })
        : await sandbox.runCommand({
            cmd: "claude",
            args: [
              "-p",
              agentPrompt,
              "--output-format",
              "text",
              "--max-turns",
              "12",
              "--dangerously-skip-permissions",
            ],
            cwd,
            env: agentEnv,
            timeoutMs: AGENT_COMMAND_TIMEOUT_MS,
          });

    throwIfCancelled(runId);

    const stdout = sanitize(await result.stdout());
    const stderr = sanitize(await result.stderr());

    if ((result.exitCode ?? 1) !== 0) {
      if (isFlowRunCancelled(runId)) {
        throw new FatalError("Run cancelled by user");
      }
      throw new Error(
        stderr || stdout || `${runtimeLabel} exited with an error`
      );
    }

    return stdout.trim();
  } catch (error) {
    if (error instanceof FatalError) {
      await stopSandbox(sandbox);
      throw error;
    }

    if (isFlowRunCancelled(runId)) {
      await stopSandbox(sandbox);
      throw new FatalError("Run cancelled by user");
    }

    throw new Error(sanitize(formatSandboxError(error)));
  } finally {
    await stopSandbox(sandbox);
  }
}

/** @deprecated Use runAgentNode */
export async function runClaudeCodeNode(params: {
  node: Extract<AgentFlowNode, { type: "claude-code" }>;
  prompt: string;
  runId: string;
  secretsToRedact: string[];
}) {
  return runAgentNode(params);
}
