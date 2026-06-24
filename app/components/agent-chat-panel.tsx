"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  parseAgentEvent,
  type AgentActivityItem,
  type AgentProgressEvent,
  type AgentSessionSummary,
} from "@/lib/claude-agent";
import { streamEventToActivity } from "@/lib/claude-stream-parser";
import type { ChatMessage } from "@/lib/agent-session-store";

const DEFAULT_PROMPT =
  "Create hello.js that prints the first 10 prime numbers, run it with Node.js, and tell me the output.";

type StepState = {
  status: "pending" | "started" | "completed" | "failed";
  message?: string;
};

function ActivityFeed({
  activity,
  thinking,
  compact = false,
}: {
  activity: AgentActivityItem[];
  thinking?: string;
  compact?: boolean;
}) {
  if (activity.length === 0 && !thinking) {
    return null;
  }

  return (
    <div
      className={`space-y-2 ${compact ? "mt-2" : "rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"}`}
    >
      {thinking ? (
        <details className="group rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-amber-700 dark:text-amber-300">
            Thinking
          </summary>
          <p className="mt-2 text-xs leading-5 whitespace-pre-wrap text-amber-900/80 italic dark:text-amber-100/80">
            {thinking}
          </p>
        </details>
      ) : null}

      {activity.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                item.status === "running"
                  ? "animate-pulse bg-violet-500"
                  : "bg-emerald-500"
              }`}
            />
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {item.label}
            </p>
          </div>
          {item.detail ? (
            <pre className="mt-2 max-h-40 overflow-auto text-xs leading-5 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
              {item.detail}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AgentChatPanel() {
  const [sessions, setSessions] = useState<AgentSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<Record<string, StepState>>({});
  const [liveActivity, setLiveActivity] = useState<AgentActivityItem[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [liveThinking, setLiveThinking] = useState("");

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const loadSessions = useCallback(async () => {
    const response = await fetch("/api/agent/sessions");
    if (!response.ok) return;
    const data = (await response.json()) as { sessions: AgentSessionSummary[] };
    setSessions(data.sessions);
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/agent/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error("Could not load session");
    }

    const data = (await response.json()) as {
      session: AgentSessionSummary;
      messages: ChatMessage[];
    };

    setActiveSessionId(sessionId);
    setMessages(data.messages);
    setSessions((current) => {
      const others = current.filter((session) => session.id !== sessionId);
      return [data.session, ...others];
    });
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  function resetSteps() {
    setSteps({});
  }

  function resetLiveStream() {
    setLiveActivity([]);
    setStreamingText("");
    setLiveThinking("");
  }

  function applyStreamEvent(event: AgentProgressEvent) {
    if (event.type === "step") {
      setSteps((current) => ({
        ...current,
        [event.step]: {
          status: event.status,
          message: event.message,
        },
      }));
      return;
    }

    if (event.type === "session") {
      setSessions((current) => {
        const others = current.filter(
          (session) => session.id !== event.session.id
        );
        return [event.session, ...others];
      });
      setActiveSessionId(event.session.id);
      return;
    }

    if (event.type === "agent_event") {
      const streamEvent = event.event;
      if (streamEvent.kind === "text_delta") {
        setStreamingText((current) => current + streamEvent.text);
      }
      if (
        streamEvent.kind === "thinking" ||
        streamEvent.kind === "thinking_delta"
      ) {
        setLiveThinking((current) =>
          streamEvent.kind === "thinking"
            ? streamEvent.text
            : current + streamEvent.text
        );
      }
      setLiveActivity((current) => streamEventToActivity(streamEvent, current));
      return;
    }

    if (event.type === "activity_snapshot") {
      setLiveActivity(event.activity);
      setStreamingText(event.streamingText);
      return;
    }

    if (event.type === "assistant_message") {
      setStreamingText(event.content);
      return;
    }

    if (event.type === "error") {
      setError(event.message);
    }
  }

  async function consumeStream(response: Response) {
    if (!response.ok || !response.body) {
      throw new Error("Could not reach agent");
    }

    let resolvedSessionId = activeSessionId;

    const handleEvent = (event: AgentProgressEvent) => {
      if (event.type === "session") {
        resolvedSessionId = event.session.id;
      }
      if (event.type === "complete") {
        resolvedSessionId = event.sessionId;
      }
      applyStreamEvent(event);
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = parseAgentEvent(line);
        if (event) handleEvent(event);
      }
    }

    await loadSessions();
    if (resolvedSessionId) {
      await loadSession(resolvedSessionId);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt || isRunning) return;

    setError(null);
    resetSteps();
    resetLiveStream();
    setIsRunning(true);
    setDraft("");

    const isNewSession = !activeSessionId || activeSession?.status === "stopped";
    if (!isNewSession) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: prompt,
          createdAt: Date.now(),
        },
      ]);
    }

    try {
      const response = await fetch(
        isNewSession
          ? "/api/agent/sessions"
          : `/api/agent/sessions/${activeSessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }
      );

      await consumeStream(response);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong"
      );
    } finally {
      setIsRunning(false);
      resetLiveStream();
    }
  }

  function startNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setDraft(DEFAULT_PROMPT);
    setError(null);
    resetSteps();
    resetLiveStream();
  }

  async function handleSelectSession(sessionId: string) {
    setError(null);
    resetSteps();
    resetLiveStream();
    try {
      await loadSession(sessionId);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load session"
      );
    }
  }

  async function handleStopSession() {
    if (!activeSessionId) return;

    setError(null);
    const response = await fetch(`/api/agent/sessions/${activeSessionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not stop session");
      return;
    }

    await loadSessions();
    await loadSession(activeSessionId);
  }

  const runningStep = Object.entries(steps).find(
    ([, state]) => state.status === "started"
  )?.[0];

  const showLiveStream =
    isRunning &&
    (liveActivity.length > 0 || streamingText || liveThinking || runningStep);

  return (
    <div className="grid min-h-[70vh] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Conversations
          </p>
          <button
            type="button"
            onClick={startNewChat}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500"
          >
            New chat
          </button>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-500">No conversations yet.</p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => void handleSelectSession(session.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  session.id === activeSessionId
                    ? "border-violet-500/40 bg-violet-500/10"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                }`}
              >
                <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {session.title}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                  <span>{session.messageCount} messages</span>
                  <span>•</span>
                  <span>{session.status}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-h-[70vh] flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {activeSession ? activeSession.title : "New conversation"}
            </p>
            <p className="text-xs text-zinc-500">
              {activeSession
                ? `Sandbox ${activeSession.sandboxName}`
                : "Start a fresh Claude Code session"}
            </p>
          </div>
          {activeSession?.status === "active" ? (
            <button
              type="button"
              onClick={() => void handleStopSession()}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Stop sandbox
            </button>
          ) : null}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 && !showLiveStream ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800">
              Send a message to start a new conversation, or select a previous
              chat from the sidebar to resume it.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                {message.role === "assistant" &&
                (message.activity?.length || message.thinking) ? (
                  <ActivityFeed
                    activity={message.activity ?? []}
                    thinking={message.thinking}
                  />
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}

          {showLiveStream ? (
            <div className="flex flex-col items-start">
              <ActivityFeed
                activity={liveActivity}
                thinking={liveThinking}
              />
              {streamingText ? (
                <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                  {streamingText}
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-violet-500 align-middle" />
                </div>
              ) : (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-violet-700 dark:text-violet-300">
                  {runningStep
                    ? `Running step: ${runningStep}…`
                    : "Claude Code is working…"}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mx-5 mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="border-t border-zinc-200 p-5 dark:border-zinc-800"
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder={
              activeSession?.status === "stopped"
                ? "This session is stopped. Start a new chat to continue."
                : "Message Claude Code…"
            }
            disabled={isRunning || activeSession?.status === "stopped"}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100 outline-none ring-violet-500 focus:ring-2 disabled:opacity-60 dark:border-zinc-800"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              {activeSession?.status === "active"
                ? "Follow-up messages resume the same sandbox and Claude session."
                : "First message creates a persistent sandbox."}
            </p>
            <button
              type="submit"
              disabled={
                isRunning ||
                !draft.trim() ||
                activeSession?.status === "stopped"
              }
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
