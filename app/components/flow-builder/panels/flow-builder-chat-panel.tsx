"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatStatus } from "ai";
import { Workflow } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";
import { canRunFlow } from "@/lib/flow/credentials";
import {
  applyFlowActions,
  isActionsEmpty,
  isEndToEndBuildRequest,
  stripActionsBlock,
  type FlowBuilderActions,
  type FlowBuilderChatMessage,
  type FlowBuilderChatSegment,
  type FlowBuilderChatStreamEvent,
} from "@/lib/flow-builder/chat";
import {
  buildRunContinuationPrompt,
  selfImprovementUserLabel,
  shouldContinueSelfImprovement,
  summarizeRunDiagnostics,
  waitForFlowRunCompletion,
  type FlowRunContext,
  type FlowRunDiagnostics,
} from "@/lib/flow/run-diagnostics";
import type { FlowEdge, FlowNode } from "@/lib/flow/types";
import { cn } from "@/lib/utils";

const MAX_SELF_IMPROVE_TURNS = 4;

const STARTER_SUGGESTIONS = [
  "Create a repo summarizer from start to finish",
  "Build a 3-step GitHub triage flow and run it",
  "Add an OpenCode node for CI fixes",
];

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
  onClose?: () => void;
  fullWidth?: boolean;
  bootstrapMessage?: string | null;
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

function AssistantSegments({
  segments,
  isAnimating = false,
}: {
  segments: FlowBuilderChatSegment[];
  isAnimating?: boolean;
}) {
  const visible = trimEmptyTextSegments(segments);
  if (visible.length === 0) {
    return null;
  }

  return (
    <Message from="assistant">
      <MessageContent className="w-full max-w-none gap-3">
        {visible.map((segment, index) => {
          if (segment.type === "text") {
            const text = stripActionsBlock(segment.content);
            if (!text.trim()) {
              return null;
            }

            return (
              <MessageResponse isAnimating={isAnimating} key={`text-${index}`}>
                {text}
              </MessageResponse>
            );
          }

          if (segment.type === "run_report") {
            const isFailure =
              segment.status === "failed" || segment.status === "cancelled";

            return (
              <Task
                className={cn(
                  "rounded-xl border",
                  isFailure
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                )}
                defaultOpen
                key={`run-${index}`}
              >
                <TaskTrigger title={`Run ${segment.status}`} />
                <TaskContent>
                  {segment.summary.map((item) => (
                    <TaskItem key={item}>
                      {isFailure ? "✗" : "●"} {item}
                    </TaskItem>
                  ))}
                </TaskContent>
              </Task>
            );
          }

          return (
            <Task className="rounded-xl border" defaultOpen key={`actions-${index}`}>
              <TaskTrigger title="Workflow changes" />
              <TaskContent>
                {segment.summary.map((item) => (
                  <TaskItem key={item}>✓ {item}</TaskItem>
                ))}
              </TaskContent>
            </Task>
          );
        })}
      </MessageContent>
    </Message>
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
  fullWidth = true,
  bootstrapMessage,
}: FlowBuilderChatPanelProps) {
  const [messages, setMessages] = useState<FlowBuilderChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [liveSegments, setLiveSegments] = useState<FlowBuilderChatSegment[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
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
    if (!bootstrapMessage?.trim() || isThinking) {
      return;
    }
    setDraft(bootstrapMessage);
  }, [bootstrapMessage, isThinking]);

  const chatStatus = useMemo((): ChatStatus => {
    if (error) return "error";
    if (!isThinking) return "ready";
    const hasLiveText = liveSegments?.some(
      (segment) => segment.type === "text" && segment.content.trim().length > 0
    );
    return hasLiveText ? "streaming" : "submitted";
  }, [error, isThinking, liveSegments]);

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
      if (!canRunFlow(nextFlow.nodes)) {
        summary.push(
          "Run blocked — add skills, scripts, prompts, and credentials in the Credentials panel first"
        );
      } else {
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

  async function submitPrompt(prompt: string) {
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

  async function handlePromptSubmit(message: PromptInputMessage) {
    await submitPrompt(message.text.trim());
  }

  const showEmptyState =
    messages.length === 0 && (!liveSegments || liveSegments.length === 0);

  return (
    <aside
      className={cn(
        "builder-chat flex min-h-0 flex-col",
        fullWidth ? "builder-chat--full" : "builder-chat--panel"
      )}
    >
      {!fullWidth ? (
        <div className="builder-chat__header flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Assistant
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Build, run, and refine workflows
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              aria-label="Close assistant"
            >
              Hide
            </button>
          ) : null}
        </div>
      ) : null}

      <Conversation className="builder-chat__thread">
        <ConversationContent
          className={cn(
            "builder-chat__thread-inner gap-6",
            fullWidth && "builder-chat__thread-inner--full"
          )}
        >
          {showEmptyState ? (
            <ConversationEmptyState
              className="builder-chat-empty min-h-[min(420px,50vh)]"
              description="Describe a workflow and I'll create it, run it, read the logs, and fix issues until it works."
              icon={
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--text-secondary)] shadow-sm">
                  <Workflow className="size-6" />
                </div>
              }
              title="What should we build?"
            >
              <Suggestions className="mt-8 max-w-lg">
                {STARTER_SUGGESTIONS.map((suggestion) => (
                  <Suggestion
                    key={suggestion}
                    onClick={setDraft}
                    suggestion={suggestion}
                    variant="outline"
                  />
                ))}
              </Suggestions>
            </ConversationEmptyState>
          ) : null}

          {messages.map((message, index) =>
            message.role === "user" ? (
              <Message from="user" key={`user-${index}`}>
                <MessageContent>
                  <MessageResponse>{message.content}</MessageResponse>
                </MessageContent>
              </Message>
            ) : message.segments?.length ? (
              <AssistantSegments
                key={`assistant-${index}`}
                segments={message.segments}
              />
            ) : message.content.trim() ? (
              <Message from="assistant" key={`assistant-${index}`}>
                <MessageContent>
                  <MessageResponse>
                    {stripActionsBlock(message.content)}
                  </MessageResponse>
                </MessageContent>
              </Message>
            ) : null
          )}

          {liveSegments && liveSegments.length > 0 ? (
            <AssistantSegments isAnimating segments={liveSegments} />
          ) : isThinking ? (
            <Reasoning isStreaming open>
              <ReasoningTrigger />
              <ReasoningContent>Building your workflow…</ReasoningContent>
            </Reasoning>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="builder-chat__composer">
        <div className="builder-chat__composer-inner">
          <PromptInput
            className="builder-chat-prompt-input"
            onSubmit={(message) => void handlePromptSubmit(message)}
          >
            <PromptInputBody>
              <PromptInputTextarea
                disabled={isThinking}
                onChange={(event) => setDraft(event.currentTarget.value)}
                placeholder="Message the assistant…"
                value={draft}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit
                disabled={isThinking || !draft.trim()}
                status={chatStatus}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </aside>
  );
}
