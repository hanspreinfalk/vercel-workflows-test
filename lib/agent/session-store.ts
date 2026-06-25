import type { AgentActivityItem } from "@/lib/agent/claude-stream-parser";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  activity?: AgentActivityItem[];
  thinking?: string;
};

export type AgentSession = {
  id: string;
  title: string;
  sandboxName: string;
  claudeSessionName: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  status: "active" | "stopped";
};

type SessionStore = {
  sessions: Map<string, AgentSession>;
  order: string[];
};

const MAX_SESSIONS = 50;

const globalForSessions = globalThis as typeof globalThis & {
  __agentSessionStore?: SessionStore;
};

const store: SessionStore =
  globalForSessions.__agentSessionStore ?? {
    sessions: new Map<string, AgentSession>(),
    order: [],
  };

globalForSessions.__agentSessionStore = store;

function enforceLimit() {
  while (store.order.length > MAX_SESSIONS) {
    const oldest = store.order.shift();
    if (oldest) {
      store.sessions.delete(oldest);
    }
  }
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
  };
}

export function createAgentSession(params: {
  id?: string;
  sandboxName: string;
  claudeSessionName: string;
  title: string;
  userMessage: string;
}): AgentSession {
  const session: AgentSession = {
    id: params.id ?? crypto.randomUUID(),
    title: params.title,
    sandboxName: params.sandboxName,
    claudeSessionName: params.claudeSessionName,
    messages: [createMessage("user", params.userMessage)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "active",
  };

  store.sessions.set(session.id, session);
  store.order.unshift(session.id);
  enforceLimit();

  return session;
}

export function getAgentSession(sessionId: string): AgentSession | null {
  return store.sessions.get(sessionId) ?? null;
}

export function listAgentSessions(): AgentSession[] {
  return store.order
    .map((id) => store.sessions.get(id))
    .filter((session): session is AgentSession => session !== undefined);
}

export function appendUserMessage(sessionId: string, content: string): ChatMessage {
  const session = store.sessions.get(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const message = createMessage("user", content);
  session.messages.push(message);
  session.updatedAt = Date.now();
  return message;
}

export function appendAssistantMessage(
  sessionId: string,
  content: string,
  options?: { activity?: AgentActivityItem[]; thinking?: string }
): ChatMessage {
  const session = store.sessions.get(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const message: ChatMessage = {
    ...createMessage("assistant", content),
    ...(options?.activity ? { activity: options.activity } : {}),
    ...(options?.thinking ? { thinking: options.thinking } : {}),
  };
  session.messages.push(message);
  session.updatedAt = Date.now();
  return message;
}

export function markSessionStopped(sessionId: string) {
  const session = store.sessions.get(sessionId);
  if (!session) {
    return;
  }

  session.status = "stopped";
  session.updatedAt = Date.now();
}
