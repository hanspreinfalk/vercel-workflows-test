"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./flow-builder.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AddNodeMenu } from "./add-node-menu";
import { ClaudeCodeFlowNode } from "./claude-code-node";
import { ManualTriggerFlowNode } from "./manual-trigger-node";
import { StopFlowNode } from "./stop-node";
import { OpenCodeFlowNode } from "./open-code-node";
import { NodeInspector } from "./node-inspector";
import { FlowBuilderChatPanel } from "./flow-builder-chat-panel";
import { FlowRunLogsPanel } from "./flow-run-logs-panel";
import { useFlowRunStream } from "./use-flow-run-stream";
import { getDefaultAgentLabel } from "@/lib/agent-node-utils";
import { hasManualTrigger } from "@/lib/flow-graph";
import { normalizeFlowNodes } from "@/lib/agent-skills";
import type { FlowDefinition, FlowEdge, FlowNode } from "@/lib/flow-types";
import {
  createDefaultClaudeNode,
  createDefaultOpenCodeNode,
  createManualTriggerNode,
  createStopNode,
} from "@/lib/flow-types";

const nodeTypes = {
  "claude-code": ClaudeCodeFlowNode,
  "open-code": OpenCodeFlowNode,
  "manual-trigger": ManualTriggerFlowNode,
  stop: StopFlowNode,
};

const FIT_VIEW_OPTIONS = {
  padding: 0.4,
  maxZoom: 0.85,
};

function toReactFlowNodes(nodes: FlowNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));
}

function toReactFlowEdges(edges: FlowEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
}

function fromReactFlowNodes(nodes: Node[]): FlowNode[] {
  return nodes.map((node) => {
    if (node.type === "manual-trigger") {
      return {
        id: node.id,
        type: "manual-trigger",
        position: node.position,
        data: node.data as Extract<FlowNode, { type: "manual-trigger" }>["data"],
      };
    }

    if (node.type === "stop") {
      return {
        id: node.id,
        type: "stop",
        position: node.position,
        data: node.data as Extract<FlowNode, { type: "stop" }>["data"],
      };
    }

    if (node.type === "open-code") {
      return {
        id: node.id,
        type: "open-code",
        position: node.position,
        data: node.data as Extract<FlowNode, { type: "open-code" }>["data"],
      };
    }

    return {
      id: node.id,
      type: "claude-code",
      position: node.position,
      data: node.data as Extract<FlowNode, { type: "claude-code" }>["data"],
    };
  });
}

function fromReactFlowEdges(edges: Edge[]): FlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
}

type FlowBuilderProps = {
  initialFlow: FlowDefinition;
};

export function FlowBuilder({ initialFlow }: FlowBuilderProps) {
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
  const [chatOpen, setChatOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [isStopping, setIsStopping] = useState(false);

  const mainGridClass = useMemo(() => {
    if (chatOpen && inspectorOpen) return "lg:grid-cols-[320px_1fr_340px]";
    if (chatOpen) return "lg:grid-cols-[320px_1fr]";
    if (inspectorOpen) return "lg:grid-cols-[1fr_340px]";
    return "lg:grid-cols-[1fr]";
  }, [chatOpen, inspectorOpen]);

  const { nodeStates, activeNodeId, runStatus, error: runError, events } =
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
        return { ok: true as const };
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

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    setInspectorOpen(true);
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <input
            value={flowName}
            onChange={(event) => setFlowName(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-950"
          />
          {savedAt ? (
            <span className="text-xs text-zinc-500">Saved</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={isRunning || nodes.length === 0}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {isRunning ? "Running…" : "Run"}
          </button>
          {isRunning ? (
            <button
              type="button"
              onClick={() => void handleStopRunFromToolbar()}
              disabled={isStopping}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-500/15 disabled:opacity-60 dark:text-red-300"
            >
              {isStopping ? "Stopping…" : "Stop"}
            </button>
          ) : null}
          {activeRunId ? (
            <Link
              href={`/builder/runs/${activeRunId}`}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              View run details
            </Link>
          ) : null}
        </div>
      </div>

      {runStatusLabel ? (
        <div
          className={`border-b px-4 py-2 text-sm ${
            runStatus === "completed"
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
              : runStatus === "cancelled"
                ? "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-200"
              : runStatus === "failed"
                ? "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300"
                : "border-blue-500/20 bg-blue-500/5 text-blue-800 dark:text-blue-200"
          }`}
        >
          Flow {runStatusLabel.toLowerCase()}
          {runError ? `: ${runError}` : null}
        </div>
      ) : null}

      {error ? (
        <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className={`grid min-h-0 flex-1 ${mainGridClass}`}>
        {chatOpen ? (
          <FlowBuilderChatPanel
            flowId={initialFlow.id}
            flowName={flowName}
            nodes={flowNodes}
            edges={fromReactFlowEdges(edges)}
            selectedNodeId={selectedNodeId}
            activeRunId={activeRunId}
            runStatus={runStatus}
            isRunning={isRunning}
            onApplyFlow={applyFlowFromChat}
            onRunFlow={(payload) => handleRun(payload)}
            onStopFlow={handleStopRun}
            onClose={() => setChatOpen(false)}
          />
        ) : null}

        <div className="relative flex min-h-0 flex-col">
          {!chatOpen ? (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-r-lg border border-l-0 border-zinc-200 bg-white px-2 py-3 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              aria-label="Open flow assistant chat"
            >
              Chat
            </button>
          ) : null}

          {!inspectorOpen ? (
            <button
              type="button"
              onClick={() => setInspectorOpen(true)}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-l-lg border border-r-0 border-zinc-200 bg-white px-2 py-3 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              aria-label="Open node inspector"
            >
              Inspector
            </button>
          ) : null}

          <div className="flow-builder-canvas min-h-0 flex-1">
            <ReactFlow
              nodes={displayNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => selectNode(node.id)}
              fitView
              fitViewOptions={FIT_VIEW_OPTIONS}
            >
              <Background />
              <MiniMap />
              <Controls showInteractive={false} />
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

        {inspectorOpen ? (
          <NodeInspector
            node={selectedNode}
            onChange={updateSelectedNode}
            onClose={() => setInspectorOpen(false)}
            onRemove={removeSelectedNode}
          />
        ) : null}
      </div>
    </div>
  );
}
