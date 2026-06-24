export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type AgentSessionSummary = {
  id: string;
  title: string;
  sandboxName: string;
  claudeSessionName: string;
  createdAt: number;
  updatedAt: number;
  status: "active" | "stopped";
  messageCount: number;
};

export type {
  AgentActivityItem,
  AgentStreamEvent,
} from "@/lib/claude-stream-parser";

import type {
  AgentActivityItem,
  AgentStreamEvent,
} from "@/lib/claude-stream-parser";

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
      type: "session";
      session: AgentSessionSummary;
    }
  | {
      type: "agent_event";
      event: AgentStreamEvent;
    }
  | {
      type: "activity_snapshot";
      activity: AgentActivityItem[];
      streamingText: string;
    }
  | {
      type: "assistant_message";
      content: string;
    }
  | {
      type: "complete";
      sessionId: string;
      sandboxId: string;
      durationMs: number;
    }
  | { type: "error"; message: string };

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

export function toSessionSummary(session: {
  id: string;
  title: string;
  sandboxName: string;
  claudeSessionName: string;
  createdAt: number;
  updatedAt: number;
  status: "active" | "stopped";
  messages: unknown[];
}): AgentSessionSummary {
  return {
    id: session.id,
    title: session.title,
    sandboxName: session.sandboxName,
    claudeSessionName: session.claudeSessionName,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    status: session.status,
    messageCount: session.messages.length,
  };
}

export function makeSessionTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}
