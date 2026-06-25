"use client";

import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AddNodeMenu } from "./toolbar/add-node-menu";
import { WorkspaceShell } from "@/app/components/workspace/shell/workspace-shell";
import type { WorkflowSummary } from "@/app/components/workspace/shell/workflow-selector";
import { NodeInspector } from "./panels/node-inspector";
import { FlowBuilderChatPanel } from "./panels/flow-builder-chat-panel";
import { FlowBuilderCredentialsView } from "./panels/flow-builder-credentials-view";
import { FlowRunLogsPanel } from "./panels/flow-run-logs-panel";
import { useFlowRunStream } from "./runs/use-flow-run-stream";
import {
  DEFAULT_EDGE_OPTIONS,
  FIT_VIEW_OPTIONS,
  fromReactFlowEdges,
  fromReactFlowNodes,
  toReactFlowEdges,
  toReactFlowNodes,
} from "./canvas/flow-adapters";
import { flowNodeTypes } from "./canvas/node-types";
import { getDefaultAgentLabel } from "@/lib/agent/node-utils";
import { canRunFlow, getMissingFlowRequirements } from "@/lib/flow/credentials";
import { hasManualTrigger } from "@/lib/flow/graph";
import { normalizeFlowNodes } from "@/lib/agent/skills";
import type { FlowDefinition, FlowEdge, FlowNode } from "@/lib/flow/types";
import {
  createDefaultClaudeNode,
  createDefaultOpenCodeNode,
  createManualTriggerNode,
  createStopNode,
} from "@/lib/flow/types";

type FlowBuilderProps = {
  initialFlow: FlowDefinition;
  flows: WorkflowSummary[];
};

export function FlowBuilder({
  initialFlow,
  flows,
}: FlowBuilderProps) {
  const normalizedFlow = useMemo(
    () => ({
      ...initialFlow,
      nodes: normalizeFlowNodes(initialFlow.nodes),
    }),
    [initialFlow]
  );

  const [flowName, setFlowName] = useState(normalizedFlow.name);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    toReactFlowNodes(normalizedFlow.nodes)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    toReactFlowEdges(normalizedFlow.edges)
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    normalizedFlow.nodes[0]?.id ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);

  useEffect(() => {
    const key = `flow-bootstrap-${initialFlow.id}`;
    const message = sessionStorage.getItem(key);
    if (message) {
      sessionStorage.removeItem(key);
      setBootstrapMessage(message);
    }
  }, [initialFlow.id]);

  const mainGridClass = useMemo(() => {
    const base = "grid min-h-0 flex-1 grid-cols-1";
    if (canvasOpen && inspectorOpen) {
      return cn(
        base,
        "lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_minmax(280px,320px)]",
        "max-lg:grid-cols-1 max-lg:grid-rows-[auto_auto_auto]"
      );
    }
    if (canvasOpen) {
      return cn(
        base,
        "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]",
        "max-lg:grid-cols-1 max-lg:grid-rows-[auto_auto]"
      );
    }
    return base;
  }, [canvasOpen, inspectorOpen]);

  const { nodeStates, activeNodeId, runStatus, error: runError, events, results } =
    useFlowRunStream(activeRunId);

  const displayNodes = useMemo(
    () =>
      activeRunId
        ? nodes.map((node) => {
            const state = nodeStates[node.id];
            const runStatus =
              activeNodeId === node.id
                ? ("started" as const)
                : state?.status === "completed" || state?.status === "failed"
                  ? state.status
                  : undefined;

            return {
              ...node,
              data: {
                ...node.data,
                runStatus,
              },
            };
          })
        : nodes,
    [nodes, nodeStates, activeNodeId, activeRunId]
  );

  const flowNodes = useMemo(() => fromReactFlowNodes(nodes), [nodes]);

  const runReady = useMemo(() => canRunFlow(flowNodes), [flowNodes]);
  const missingRequirements = useMemo(
    () => getMissingFlowRequirements(flowNodes),
    [flowNodes]
  );

  const selectedNode = useMemo(
    () => flowNodes.find((node) => node.id === selectedNodeId) ?? null,
    [flowNodes, selectedNodeId]
  );

  const flowPayload = useMemo(
    () => ({
      name: flowName,
      nodes: flowNodes,
      edges: fromReactFlowEdges(edges),
    }),
    [flowName, flowNodes, edges]
  );

  const saveFlow = useCallback(
    async (payload = flowPayload) => {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/builder/flows/${initialFlow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Failed to save flow");
        setIsSaving(false);
        return false;
      }

      setSavedAt(Date.now());
      setIsSaving(false);
      return true;
    },
    [flowPayload, initialFlow.id]
  );

  const handleRun = useCallback(
    async (payload = flowPayload) => {
      setIsRunning(true);
      setError(null);

      if (!hasManualTrigger(payload.nodes)) {
        const message = "Add a Start node to run the flow.";
        setError(message);
        setIsRunning(false);
        return { ok: false as const, error: message };
      }

      if (!canRunFlow(payload.nodes)) {
        const message =
          "Add skills, scripts, prompts, and credentials for every agent before running.";
        setError(message);
        setCredentialsOpen(true);
        setIsRunning(false);
        return { ok: false as const, error: message };
      }

      const saved = await saveFlow(payload);
      if (!saved) {
        setIsRunning(false);
        return { ok: false as const, error: "Failed to save flow" };
      }

      try {
        const response = await fetch(
          `/api/builder/flows/${initialFlow.id}/run`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const data = (await response.json()) as {
          runId?: string;
          error?: string;
        };

        if (!response.ok || !data.runId) {
          throw new Error(data.error ?? "Failed to start flow");
        }

        setActiveRunId(data.runId);
        return { ok: true as const, runId: data.runId };
      } catch (runError) {
        const message =
          runError instanceof Error ? runError.message : "Failed to run flow";
        setError(message);
        setIsRunning(false);
        return { ok: false as const, error: message };
      }
    },
    [flowPayload, initialFlow.id, saveFlow]
  );

  const handleStopRun = useCallback(async () => {
    if (!activeRunId) {
      return { ok: false as const, error: "No active run to stop" };
    }

    if (isStopping) {
      return { ok: false as const, error: "Stop already in progress" };
    }

    setIsStopping(true);
    try {
      const response = await fetch(
        `/api/builder/runs/${activeRunId}/cancel`,
        { method: "POST" }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to stop workflow");
      }

      return { ok: true as const };
    } catch (stopError) {
      const message =
        stopError instanceof Error
          ? stopError.message
          : "Failed to stop workflow";
      setError(message);
      setIsStopping(false);
      return { ok: false as const, error: message };
    }
  }, [activeRunId, isStopping]);

  function applyFlowFromChat(result: {
    flowName: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    selectedNodeId: string | null;
  }) {
    setFlowName(result.flowName);
    setNodes(toReactFlowNodes(result.nodes));
    setEdges(toReactFlowEdges(result.edges));
    if (result.selectedNodeId) {
      setSelectedNodeId(result.selectedNodeId);
      setInspectorOpen(true);
    }
  }

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge({ ...connection, id: crypto.randomUUID() }, current)
      ),
    [setEdges]
  );

  function selectNode(nodeId: string, options?: { openCanvas?: boolean }) {
    setSelectedNodeId(nodeId);
    setInspectorOpen(true);
    if (options?.openCanvas) {
      setCanvasOpen(true);
    }
  }

  function addAgentNode(type: "claude-code" | "open-code") {
    const id = crypto.randomUUID();
    const label = getDefaultAgentLabel(flowNodes);
    const position = {
      x: 120 + nodes.length * 40,
      y: 220 + nodes.length * 20,
    };
    const newNode =
      type === "open-code"
        ? createDefaultOpenCodeNode(id, position, label)
        : createDefaultClaudeNode(id, position, label);
    setNodes((current) => [...current, toReactFlowNodes([newNode])[0]]);
    selectNode(id);
  }

  function addStopNode() {
    const id = crypto.randomUUID();
    const stopCount = flowNodes.filter((node) => node.type === "stop").length;
    const newNode = createStopNode(
      id,
      { x: 280 + (nodes.length + stopCount) * 40, y: 240 },
      stopCount === 0 ? "Stop" : `Stop ${stopCount + 1}`
    );
    setNodes((current) => [...current, toReactFlowNodes([newNode])[0]]);
    selectNode(id);
  }
  function addManualTriggerNode() {
    if (flowNodes.some((node) => node.type === "manual-trigger")) {
      setError("This flow already has a Start node.");
      return;
    }

    setError(null);
    const id = crypto.randomUUID();
    const newNode = createManualTriggerNode(id, { x: 40, y: 140 });
    setNodes((current) => [toReactFlowNodes([newNode])[0], ...current]);
    selectNode(id);
  }

  function updateAgentNode(node: FlowNode) {
    setNodes((current) =>
      current.map((item) =>
        item.id === node.id ? toReactFlowNodes([node])[0] : item
      )
    );
  }

  function updateSelectedNode(node: FlowNode) {
    if (!selectedNodeId) return;
    setNodes((current) =>
      current.map((item) =>
        item.id === selectedNodeId
          ? toReactFlowNodes([node])[0]
          : item
      )
    );
  }

  function removeSelectedNode() {
    if (!selectedNodeId) return;

    const remaining = nodes.filter((node) => node.id !== selectedNodeId);
    setNodes(remaining);
    setEdges((current) =>
      current.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId
      )
    );
    setSelectedNodeId(remaining[0]?.id ?? null);
  }

  async function handleStopRunFromToolbar() {
    await handleStopRun();
  }

  useEffect(() => {
    const timer = setInterval(() => {
      void saveFlow();
    }, 30_000);
    return () => clearInterval(timer);
  }, [saveFlow]);

  useEffect(() => {
    if (
      runStatus === "completed" ||
      runStatus === "failed" ||
      runStatus === "cancelled"
    ) {
      setIsRunning(false);
      setIsStopping(false);
    }
  }, [runStatus]);

  const runStatusLabel =
    runStatus === "connecting"
      ? "Connecting…"
      : runStatus === "running"
        ? "Running"
        : runStatus === "completed"
          ? "Completed"
          : runStatus === "cancelled"
            ? "Stopped"
          : runStatus === "failed"
            ? "Failed"
            : null;

  const toolbar = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <input
          value={flowName}
          onChange={(event) => setFlowName(event.target.value)}
          className="workspace-input min-w-0 max-w-full flex-1 rounded-lg px-3 py-1.5 text-sm font-medium sm:max-w-xs"
          aria-label="Workflow name"
        />
        {savedAt ? (
          <span className="hidden shrink-0 text-xs text-[var(--text-tertiary)] sm:inline">
            Saved
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <AddNodeMenu
          onAddManualTrigger={addManualTriggerNode}
          onAddClaudeCode={() => addAgentNode("claude-code")}
          onAddOpenCode={() => addAgentNode("open-code")}
          onAddStopNode={addStopNode}
          onStopWorkflow={() => void handleStopRunFromToolbar()}
          hasManualTrigger={flowNodes.some(
            (node) => node.type === "manual-trigger"
          )}
          canStopWorkflow={isRunning && Boolean(activeRunId)}
          isStopping={isStopping}
        />
        <button
          type="button"
          onClick={() => void saveFlow()}
          disabled={isSaving}
          className="workspace-btn-ghost rounded-lg px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={isRunning || nodes.length === 0 || !runReady}
          title={
            !runReady
              ? `${missingRequirements.length} requirement(s) missing — open Credentials`
              : undefined
          }
          className="workspace-btn-primary rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:opacity-60"
        >
          {isRunning ? "Running…" : "Run"}
        </button>
        {isRunning ? (
          <button
            type="button"
            onClick={() => void handleStopRunFromToolbar()}
            disabled={isStopping}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-sm font-medium text-red-400 transition hover:bg-red-500/15 disabled:opacity-60"
          >
            {isStopping ? "Stopping…" : "Stop"}
          </button>
        ) : null}
        {activeRunId ? (
          <Link
            href={`/builder/runs/${activeRunId}`}
            className="workspace-btn-ghost rounded-lg px-3.5 py-1.5 text-sm transition"
          >
            Run details
          </Link>
        ) : null}
      </div>
    </>
  );

  const isRunActive =
    runStatus === "connecting" || runStatus === "running";

  return (
    <WorkspaceShell
      flows={flows}
      currentFlowId={initialFlow.id}
      activeTab="workflows"
      toolbar={toolbar}
    >
    <div className="flex h-full min-h-0 flex-col bg-[var(--canvas)]">

      {error ? (
        <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div className={mainGridClass}>
        <div
          className={cn(
            "flex min-h-0 flex-col bg-[var(--canvas)]",
            canvasOpen && "max-lg:order-1"
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 max-lg:flex-wrap max-lg:gap-2 sm:px-4">
            <div className="flex items-center gap-1.5 max-lg:w-full max-lg:flex-wrap">
              <button
                type="button"
                onClick={() => setCanvasOpen((open) => !open)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-3.5 py-[0.4375rem] text-[0.8125rem] font-medium text-[var(--text-secondary)] transition-[background,color,border-color] duration-[120ms] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] max-lg:px-2.5 max-lg:text-xs",
                  canvasOpen &&
                    "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
                )}
                aria-pressed={canvasOpen}
              >
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M3 4.75A1.75 1.75 0 0 1 4.75 3h10.5A1.75 1.75 0 0 1 17 4.75v10.5A1.75 1.75 0 0 1 15.25 17H4.75A1.75 1.75 0 0 1 3 15.25V4.75Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.75a.25.25 0 0 0-.25-.25H4.75Z" />
                </svg>
                Workflow view
              </button>
              <button
                type="button"
                onClick={() => setCredentialsOpen((open) => !open)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-3.5 py-[0.4375rem] text-[0.8125rem] font-medium text-[var(--text-secondary)] transition-[background,color,border-color] duration-[120ms] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] max-lg:px-2.5 max-lg:text-xs",
                  credentialsOpen &&
                    "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]",
                  !runReady && "text-[var(--brand)]"
                )}
                aria-pressed={credentialsOpen}
              >
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M10 2a4 4 0 0 0-2 1.5v1.7a3 3 0 0 0-1 .8l-1.5 1.5a1 1 0 0 0 0 1.4l1.5 1.5a3 3 0 0 0 1 .8V16A4 4 0 1 0 10 2Zm0 11.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
                </svg>
                Credentials
                {!runReady ? (
                  <span className="rounded-full bg-[var(--brand)]/15 px-1.5 py-0.5 text-[10px] text-[var(--brand)]">
                    {missingRequirements.length}
                  </span>
                ) : null}
              </button>
              {canvasOpen ? (
                <button
                  type="button"
                  onClick={() => setInspectorOpen((open) => !open)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-3.5 py-[0.4375rem] text-[0.8125rem] font-medium text-[var(--text-secondary)] transition-[background,color,border-color] duration-[120ms] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] max-lg:px-2.5 max-lg:text-xs",
                    inspectorOpen &&
                      "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
                  )}
                  aria-pressed={inspectorOpen}
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M4 4.75A1.75 1.75 0 0 1 5.75 3h8.5A1.75 1.75 0 0 1 16 4.75v10.5A1.75 1.75 0 0 1 14.25 17h-8.5A1.75 1.75 0 0 1 4 15.25V4.75Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V4.75a.25.25 0 0 0-.25-.25h-8.5Z" />
                  </svg>
                  Inspector
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {runStatusLabel ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[0.6875rem] font-medium text-[var(--text-secondary)]",
                    isRunActive &&
                      "border-[color-mix(in_oklab,var(--brand)_35%,var(--border))] text-[var(--brand)]"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full bg-current",
                      isRunActive && "animate-pulse"
                    )}
                  />
                  {runStatusLabel}
                  {runError ? ` — ${runError}` : null}
                </span>
              ) : null}
              {canvasOpen ? (
                <span className="hidden text-xs text-[var(--text-tertiary)] sm:inline">
                  {nodes.length} node{nodes.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>

          {credentialsOpen ? (
            <FlowBuilderCredentialsView
              flowName={flowName}
              nodes={flowNodes}
              onUpdateNode={updateAgentNode}
              onSelectNode={(nodeId) => {
                selectNode(nodeId, { openCanvas: true });
              }}
            />
          ) : (
            <FlowBuilderChatPanel
              flowId={initialFlow.id}
              flowName={flowName}
              nodes={flowNodes}
              edges={fromReactFlowEdges(edges)}
              selectedNodeId={selectedNodeId}
              activeRunId={activeRunId}
              runStatus={runStatus}
              isRunning={isRunning}
              bootstrapMessage={bootstrapMessage}
              lastRun={
                activeRunId
                  ? {
                      runId: activeRunId,
                      status: runStatus,
                      error: runError,
                      events,
                      nodeOutputs: nodeStates,
                      results,
                    }
                  : null
              }
              onApplyFlow={applyFlowFromChat}
              onRunFlow={(payload) => handleRun(payload)}
              onStopFlow={handleStopRun}
              onOpenCredentials={() => setCredentialsOpen(true)}
              fullWidth
            />
          )}
        </div>

        {canvasOpen ? (
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col bg-[#0c0c0c]",
            "max-lg:order-2 max-lg:min-h-[min(50vh,420px)]"
          )}
        >
          <div className="flow-builder-canvas relative min-h-0 flex-1">
            {nodes.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Empty workflow
                </p>
                <p className="max-w-64 text-xs leading-normal text-[var(--text-secondary)]">
                  Add a Start node from the toolbar, or ask the assistant to
                  build one for you.
                </p>
              </div>
            ) : null}

            <ReactFlow
              nodes={displayNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={flowNodeTypes}
              defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
              onNodeClick={(_, node) => selectNode(node.id)}
              fitView
              fitViewOptions={FIT_VIEW_OPTIONS}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#27272a"
              />
              <Controls showInteractive={false} position="bottom-left" />
            </ReactFlow>
          </div>

          {activeRunId ? (
            <FlowRunLogsPanel
              events={events}
              runStatus={runStatus}
              onStop={() => void handleStopRunFromToolbar()}
              isStopping={isStopping}
            />
          ) : null}
        </div>
        ) : null}

        {canvasOpen && inspectorOpen ? (
          <NodeInspector
            node={selectedNode}
            onChange={updateSelectedNode}
            onClose={() => setInspectorOpen(false)}
            onRemove={removeSelectedNode}
          />
        ) : null}
      </div>
    </div>
    </WorkspaceShell>
  );
}
