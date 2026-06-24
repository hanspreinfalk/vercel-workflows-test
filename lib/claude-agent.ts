export type AgentProgressEvent =
  | {
      type: "step";
      step: string;
      status: "started" | "completed" | "failed";
      message?: string;
      durationMs?: number;
    }
  | { type: "log"; stream: "stdout" | "stderr"; text: string }
  | {
      type: "complete";
      sandboxId: string;
      exitCode: number;
      stdout: string;
      stderr: string;
      durationMs: number;
    }
  | { type: "error"; message: string };

export type AgentRunResult = {
  sandboxId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export class AgentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentConfigError";
  }
}

export function validateAgentPrompt(prompt: unknown): string {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Prompt is required");
  }

  if (prompt.length > 4_000) {
    throw new Error("Prompt must be 4,000 characters or fewer");
  }

  return prompt.trim();
}

export function getClaudeSandboxEnv(): Record<string, string> {
  const gatewayKey =
    process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_API_KEY;

  if (gatewayKey) {
    return {
      ANTHROPIC_BASE_URL: "https://ai-gateway.vercel.sh",
      ANTHROPIC_AUTH_TOKEN: gatewayKey,
      ANTHROPIC_API_KEY: "",
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AgentConfigError(
      "Add ANTHROPIC_API_KEY or AI_GATEWAY_API_KEY to .env.local before running the agent."
    );
  }

  return { ANTHROPIC_API_KEY: apiKey };
}

export function parseAgentEvent(line: string): AgentProgressEvent | null {
  try {
    return JSON.parse(line) as AgentProgressEvent;
  } catch {
    return null;
  }
}
