"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  applyFlowActions,
  isActionsEmpty,
  isEndToEndBuildRequest,
  stripActionsBlock,
  type FlowBuilderActions,
  type FlowBuilderChatMessage,
  type FlowBuilderChatSegment,
  type FlowBuilderChatStreamEvent,
} from "@/lib/flow-builder-chat";
import {
  buildRunContinuationPrompt,
  selfImprovementUserLabel,
  shouldContinueSelfImprovement,
  summarizeRunDiagnostics,
  waitForFlowRunCompletion,
  type FlowRunContext,
  type FlowRunDiagnostics,
} from "@/lib/flow-run-diagnostics";
import type { FlowEdge, FlowNode } from "@/lib/flow-types";

const MAX_SELF_IMPROVE_TURNS = 4;

type FlowState = {
  flowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
};

type FlowBuilderChatPanelProps = {
  flowId: string;
  flowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  activeRunId: string | null;
  runStatus: string | null;
  isRunning: boolean;
  lastRun: FlowRunContext | null;
  onApplyFlow: (result: FlowState) => void;
  onRunFlow: (payload: {
    name: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
  }) => Promise<{ ok: boolean; error?: string; runId?: string }>;
  onStopFlow: () => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

function ensureTextSegment(
  segments: FlowBuilderChatSegment[]
): FlowBuilderChatSegment[] {
  const last = segments[segments.length - 1];
  if (last?.type === "text") {
    return segments;
  }
  return [...segments, { type: "text", content: "" }];
}

function appendTextToken(
  segments: FlowBuilderChatSegment[],
  token: string
): FlowBuilderChatSegment[] {
  const withText = ensureTextSegment(segments);
  const next = [...withText];
  const lastIndex = next.length - 1;
  const last = next[lastIndex];
  if (last.type === "text") {
    next[lastIndex] = { type: "text", content: last.content + token };
  }
  return next;
}

function trimEmptyTextSegments(
  segments: FlowBuilderChatSegment[]
): FlowBuilderChatSegment[] {
  return segments.filter(
    (segment) => segment.type !== "text" || segment.content.trim().length > 0
  );
}

function segmentsToContent(segments: FlowBuilderChatSegment[]): string {
  return segments
    .filter(
      (segment): segment is Extract<FlowBuilderChatSegment, { type: "text" }> =>
        segment.type === "text"
    )
    .map((segment) => stripActionsBlock(segment.content))
    .join("\n\n")
    .trim();
}

function diagnosticsToRunContext(
  diagnostics: FlowRunDiagnostics
): FlowRunContext {
  return {
    runId: diagnostics.runId,
    status: diagnostics.status,
    error: diagnostics.error,
    events: diagnostics.events,
    nodeOutputs: diagnostics.nodeStates,
    results: diagnostics.results,
  };
}

function AssistantTurn({ segments }: { segments: FlowBuilderChatSegment[] }) {
  const visible = trimEmptyTextSegments(segments);
  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="mr-6 space-y-2">
      {visible.map((segment, index) => {
        if (segment.type === "text") {
          const text = stripActionsBlock(segment.content);
          if (!text.trim()) {
            return null;
          }

          return (
            <div
              key={`text-${index}`}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {text}
            </div>
          );
        }

        if (segment.type === "run_report") {
          const isFailure =
            segment.status === "failed" || segment.status === "cancelled";

          return (
            <ul
              key={`run-${index}`}
              className={`space-y-1 rounded-xl border px-3 py-2 text-xs ${
                isFailure
                  ? "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300"
                  : "border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-200"
              }`}
            >
              {segment.summary.map((item) => (
                <li key={item}>{isFailure ? "✗" : "●"} {item}</li>
              ))}
            </ul>
          );
        }

        return (
          <ul
            key={`actions-${index}`}
            className="space-y-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400"
          >
            {segment.summary.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

export function FlowBuilderChatPanel({
  flowId,
  flowName,
  nodes,
  edges,
  selectedNodeId,
  activeRunId,
  runStatus,
  isRunning,
  lastRun,
  onApplyFlow,
  onRunFlow,
  onStopFlow,
  onClose,
}: FlowBuilderChatPanelProps) {
  const [messages, setMessages] = useState<FlowBuilderChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [liveSegments, setLiveSegments] = useState<FlowBuilderChatSegment[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const flowStateRef = useRef<FlowState>({
    flowName,
    nodes,
    edges,
    selectedNodeId,
  });
  const lastRunRef = useRef<FlowRunContext | null>(lastRun);

  useEffect(() => {
    flowStateRef.current = { flowName, nodes, edges, selectedNodeId };
  }, [flowName, nodes, edges, selectedNodeId]);

  useEffect(() => {
    lastRunRef.current = lastRun;
  }, [lastRun]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, liveSegments]);

  async function executeActions(
    actions: FlowBuilderActions
  ): Promise<{ summary: string[]; diagnostics: FlowRunDiagnostics | null }> {
    if (isActionsEmpty(actions)) {
      return {
        summary: [
          "No canvas changes were applied. Try again or rephrase your request.",
        ],
        diagnostics: null,
      };
    }

    const currentFlow = flowStateRef.current;
    const result = applyFlowActions({
      flowName: currentFlow.flowName,
      nodes: currentFlow.nodes,
      edges: currentFlow.edges,
      selectedNodeId: currentFlow.selectedNodeId,
      actions,
    });

    const nextFlow: FlowState = {
      flowName: result.flowName,
      nodes: result.nodes,
      edges: result.edges,
      selectedNodeId: result.selectedNodeId,
    };
    flowStateRef.current = nextFlow;
    onApplyFlow(nextFlow);

    const summary = [...result.summary];
    let diagnostics: FlowRunDiagnostics | null = null;

    if (result.stopFlow) {
      const stopResult = await onStopFlow();
      summary.push(
        stopResult.ok ? "Stopped workflow" : stopResult.error ?? "Failed to stop"
      );
    }

    if (result.runFlow) {
      const runResult = await onRunFlow({
        name: nextFlow.flowName,
        nodes: nextFlow.nodes,
        edges: nextFlow.edges,
      });

      if (!runResult.ok || !runResult.runId) {
        summary.push(runResult.error ?? "Failed to run");
      } else {
        summary.push("Started workflow run");
        diagnostics = await waitForFlowRunCompletion(runResult.runId);
        lastRunRef.current = diagnosticsToRunContext(diagnostics);
        summary.push(`Run finished: ${diagnostics.status}`);
      }
    }

    return { summary, diagnostics };
  }

  async function streamAssistantTurn(params: {
    conversationMessages: FlowBuilderChatMessage[];
    runContext: FlowRunContext | null;
  }): Promise<{
    assistantMessage: FlowBuilderChatMessage;
    diagnostics: FlowRunDiagnostics | null;
  }> {
    const appliedActionKeys = new Set<string>();
    let segments: FlowBuilderChatSegment[] = [];
    let diagnostics: FlowRunDiagnostics | null = null;
    const currentFlow = flowStateRef.current;

    const response = await fetch(`/api/builder/flows/${flowId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: params.conversationMessages,
        flow: {
          name: currentFlow.flowName,
          nodes: currentFlow.nodes,
          edges: currentFlow.edges,
          selectedNodeId: currentFlow.selectedNodeId,
          activeRunId: params.runContext?.runId ?? activeRunId,
          runStatus: params.runContext?.status ?? runStatus,
          isRunning: params.runContext?.status === "running" || isRunning,
          lastRun: params.runContext ?? lastRunRef.current ?? lastRun,
        },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Could not reach flow assistant");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const streamEvent = JSON.parse(line) as FlowBuilderChatStreamEvent;

        if (streamEvent.type === "text_start") {
          segments = ensureTextSegment(segments);
          setLiveSegments([...segments]);
          continue;
        }

        if (streamEvent.type === "token") {
          segments = appendTextToken(segments, streamEvent.token);
          setLiveSegments([...segments]);
          continue;
        }

        if (streamEvent.type === "text_end") {
          segments = trimEmptyTextSegments(segments);
          setLiveSegments([...segments]);
          continue;
        }

        if (streamEvent.type === "actions") {
          const actionKey = JSON.stringify(streamEvent.actions);
          if (!appliedActionKeys.has(actionKey)) {
            appliedActionKeys.add(actionKey);
            const result = await executeActions(streamEvent.actions);
            segments = [...segments, { type: "actions", summary: result.summary }];
            if (result.diagnostics) {
              diagnostics = result.diagnostics;
              segments = [
                ...segments,
                {
                  type: "run_report",
                  status: result.diagnostics.status,
                  summary: summarizeRunDiagnostics(result.diagnostics),
                },
              ];
            }
            setLiveSegments([...segments]);
          }
          continue;
        }

        if (streamEvent.type === "done") {
          doneContent = streamEvent.content;
          segments = trimEmptyTextSegments(segments);

          const finalActionKey = JSON.stringify(streamEvent.actions);
          if (
            !appliedActionKeys.has(finalActionKey) &&
            !isActionsEmpty(streamEvent.actions)
          ) {
            appliedActionKeys.add(finalActionKey);
            const result = await executeActions(streamEvent.actions);
            segments = [...segments, { type: "actions", summary: result.summary }];
            if (result.diagnostics) {
              diagnostics = result.diagnostics;
              segments = [
                ...segments,
                {
                  type: "run_report",
                  status: result.diagnostics.status,
                  summary: summarizeRunDiagnostics(result.diagnostics),
                },
              ];
            }
          }

          segments = trimEmptyTextSegments(segments);
          const assistantMessage: FlowBuilderChatMessage = {
            role: "assistant",
            content: segmentsToContent(segments) || stripActionsBlock(doneContent),
            segments,
          };

          setMessages((current) => [...current, assistantMessage]);
          setLiveSegments(null);
          continue;
        }

        if (streamEvent.type === "error") {
          throw new Error(streamEvent.message);
        }
      }
    }

    return {
      assistantMessage: {
        role: "assistant",
        content: segmentsToContent(segments) || stripActionsBlock(doneContent),
        segments,
      },
      diagnostics,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt || isThinking) return;

    let conversationMessages: FlowBuilderChatMessage[] = [
      ...messages,
      { role: "user", content: prompt },
    ];

    setDraft("");
    setError(null);
    setIsThinking(true);
    setLiveSegments([]);
    setMessages(conversationMessages);

    const selfImprove = isEndToEndBuildRequest(prompt);
    let improveTurn = 0;
    let lastDiagnostics: FlowRunDiagnostics | null = null;
    let runContext: FlowRunContext | null = lastRunRef.current ?? lastRun;

    try {
      while (true) {
        const turn = await streamAssistantTurn({
          conversationMessages,
          runContext,
        });

        conversationMessages = [...conversationMessages, turn.assistantMessage];

        if (turn.diagnostics) {
          lastDiagnostics = turn.diagnostics;
          runContext = diagnosticsToRunContext(turn.diagnostics);
        }

        const diagnosticsForLoop = lastDiagnostics;
        if (
          !diagnosticsForLoop ||
          !shouldContinueSelfImprovement({
            enabled: selfImprove,
            diagnostics: diagnosticsForLoop,
            improveTurn,
            maxTurns: MAX_SELF_IMPROVE_TURNS,
          })
        ) {
          break;
        }

        const mode =
          diagnosticsForLoop.status === "completed" ? "verify" : "fix";
        const continuation = buildRunContinuationPrompt(diagnosticsForLoop, mode);

        conversationMessages = [
          ...conversationMessages,
          { role: "user", content: continuation },
        ];

        setMessages((current) => [
          ...current,
          {
            role: "user",
            content: selfImprovementUserLabel(diagnosticsForLoop, mode),
          },
        ]);

        improveTurn += 1;
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Chat request failed"
      );
      setLiveSegments(null);
    } finally {
      setIsThinking(false);
    }
  }

  const showEmptyState =
    messages.length === 0 && (!liveSegments || liveSegments.length === 0);

  return (
    <aside className="flex min-h-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Flow assistant
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Build, test, debug, and improve flows
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
        {showEmptyState ? (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-violet-900 dark:text-violet-100">
            <p className="font-medium">Your flow copilot</p>
            <p className="mt-2 text-violet-800/80 dark:text-violet-200/80">
              Ask me to create a flow from start to finish — I&apos;ll build it,
              run it, read the logs, and fix issues automatically. Example:
              &quot;Create a flow from start to finish with an agent that
              summarizes a repo.&quot;
            </p>
          </div>
        ) : null}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div
              key={`user-${index}`}
              className="ml-6 rounded-xl bg-zinc-100 px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {message.content}
            </div>
          ) : message.segments?.length ? (
            <AssistantTurn key={`assistant-${index}`} segments={message.segments} />
          ) : message.content.trim() ? (
            <div
              key={`assistant-${index}`}
              className="mr-6 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {stripActionsBlock(message.content)}
            </div>
          ) : null
        )}

        {liveSegments && liveSegments.length > 0 ? (
          <div className="space-y-2">
            <AssistantTurn segments={liveSegments} />
            {isThinking ? (
              <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-violet-500 align-middle" />
            ) : null}
          </div>
        ) : isThinking ? (
          <div className="mr-6 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm text-zinc-500">
            <span className="inline-block h-4 w-1 animate-pulse bg-violet-500 align-middle" />
          </div>
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
          placeholder="Build, run, debug, and improve flows…"
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={isThinking || !draft.trim()}
          className="mt-2 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {isThinking ? "Working…" : "Send"}
        </button>
      </form>
    </aside>
  );
}
