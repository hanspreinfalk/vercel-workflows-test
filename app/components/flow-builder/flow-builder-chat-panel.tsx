"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  applyFlowActions,
  isActionsEmpty,
  stripActionsBlock,
  type FlowBuilderActions,
  type FlowBuilderChatMessage,
} from "@/lib/flow-builder-chat";
import type { FlowEdge, FlowNode } from "@/lib/flow-types";

type FlowBuilderChatPanelProps = {
  flowId: string;
  flowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  activeRunId: string | null;
  runStatus: string | null;
  isRunning: boolean;
  onApplyFlow: (result: {
    flowName: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    selectedNodeId: string | null;
  }) => void;
  onRunFlow: (payload: {
    name: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
  }) => Promise<{ ok: boolean; error?: string }>;
  onStopFlow: () => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

export function FlowBuilderChatPanel({
  flowId,
  flowName,
  nodes,
  edges,
  selectedNodeId,
  activeRunId,
  runStatus,
  isRunning,
  onApplyFlow,
  onRunFlow,
  onStopFlow,
  onClose,
}: FlowBuilderChatPanelProps) {
  const [messages, setMessages] = useState<FlowBuilderChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastActionSummary, setLastActionSummary] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText]);

  async function executeActions(actions: FlowBuilderActions) {
    if (isActionsEmpty(actions)) {
      setLastActionSummary([
        "No canvas changes were applied. Try again or rephrase your request.",
      ]);
      return;
    }

    const result = applyFlowActions({
      flowName,
      nodes,
      edges,
      selectedNodeId,
      actions,
    });

    onApplyFlow({
      flowName: result.flowName,
      nodes: result.nodes,
      edges: result.edges,
      selectedNodeId: result.selectedNodeId,
    });

    const summary = [...result.summary];

    if (result.stopFlow) {
      const stopResult = await onStopFlow();
      summary.push(
        stopResult.ok ? "Stopped workflow" : stopResult.error ?? "Failed to stop"
      );
    }

    if (result.runFlow) {
      const runResult = await onRunFlow({
        name: result.flowName,
        nodes: result.nodes,
        edges: result.edges,
      });
      summary.push(
        runResult.ok ? "Started workflow run" : runResult.error ?? "Failed to run"
      );
    }

    if (summary.length > 0) {
      setLastActionSummary(summary);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt || isThinking) return;

    const nextMessages: FlowBuilderChatMessage[] = [
      ...messages,
      { role: "user", content: prompt },
    ];

    setDraft("");
    setError(null);
    setIsThinking(true);
    setStreamingText("");
    setLastActionSummary([]);
    setMessages(nextMessages);

    try {
      const response = await fetch(`/api/builder/flows/${flowId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          flow: {
            name: flowName,
            nodes,
            edges,
            selectedNodeId,
            activeRunId,
            runStatus,
            isRunning,
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Could not reach flow assistant");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = JSON.parse(line) as {
            type: string;
            token?: string;
            content?: string;
            actions?: FlowBuilderActions;
            message?: string;
          };

          if (event.type === "token" && event.token) {
            assistantText += event.token;
            setStreamingText(assistantText);
          }

          if (event.type === "done") {
            assistantText = event.content ?? assistantText;
            const actions = event.actions ?? {};

            setMessages((current) => [
              ...current,
              {
                role: "assistant",
                content: stripActionsBlock(assistantText),
              },
            ]);
            setStreamingText("");
            await executeActions(actions);
          }

          if (event.type === "error") {
            throw new Error(event.message ?? "Chat failed");
          }
        }
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Chat request failed"
      );
      setStreamingText("");
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <aside className="flex min-h-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Flow assistant
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Build, run, and control flows
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
          aria-label="Close chat panel"
        >
          Hide
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !streamingText ? (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-violet-900 dark:text-violet-100">
            <p className="font-medium">Your flow copilot</p>
            <p className="mt-2 text-violet-800/80 dark:text-violet-200/80">
              Ask me to create agents, write skills, wire nodes, run the workflow,
              or stop a run. Example: &quot;Build a 3-step GitHub triage flow and
              run it.&quot;
            </p>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap ${
              message.role === "user"
                ? "ml-6 bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                : "mr-6 border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            }`}
          >
            {message.content}
          </div>
        ))}

        {streamingText ? (
          <div className="mr-6 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
            {stripActionsBlock(streamingText)}
            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-violet-500 align-middle" />
          </div>
        ) : null}

        {lastActionSummary.length > 0 ? (
          <ul className="space-y-1 text-xs text-emerald-600 dark:text-emerald-400">
            {lastActionSummary.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          disabled={isThinking}
          placeholder="Create agents, skills, run or stop the flow…"
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={isThinking || !draft.trim()}
          className="mt-2 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {isThinking ? "Thinking…" : "Send"}
        </button>
      </form>
    </aside>
  );
}
