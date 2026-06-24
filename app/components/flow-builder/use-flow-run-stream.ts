"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseBuiltFlowProgressEvent,
  type BuiltFlowProgressEvent,
} from "@/lib/flow-progress";

export type NodeRunState = {
  label: string;
  status: "started" | "completed" | "failed";
  message?: string;
  output?: string;
};

export type FlowRunStatus =
  | "idle"
  | "connecting"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export function useFlowRunStream(runId: string | null) {
  const [nodeStates, setNodeStates] = useState<Record<string, NodeRunState>>(
    {}
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<FlowRunStatus>("idle");
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<BuiltFlowProgressEvent[]>([]);

  const fetchStatus = useCallback(async (id: string) => {
    const response = await fetch(`/api/builder/runs/${id}/status`);
    if (!response.ok) return;

    const data = (await response.json()) as {
      status: string;
      result?: Record<string, string>;
    };

    if (data.status === "completed" && data.result) {
      setResults(data.result);
      setRunStatus("completed");
    } else if (data.status === "cancelled") {
      setRunStatus("cancelled");
    } else if (data.status === "failed") {
      setRunStatus("failed");
    }
  }, []);

  useEffect(() => {
    if (!runId) {
      setNodeStates({});
      setActiveNodeId(null);
      setRunStatus("idle");
      setResults(null);
      setError(null);
      setEvents([]);
      return;
    }

    let cancelled = false;

    async function connect(id: string, startIndex = 0) {
      setRunStatus("connecting");
      setError(null);
      setNodeStates({});
      setActiveNodeId(null);
      setResults(null);
      setEvents([]);

      try {
        const response = await fetch(
          `/api/builder/runs/${id}/stream?startIndex=${startIndex}`
        );

        if (!response.ok || !response.body) {
          throw new Error("Could not connect to workflow stream");
        }

        setRunStatus("running");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = parseBuiltFlowProgressEvent(line);
            if (!event) continue;

            setEvents((current) => [...current, event]);

            if (event.event === "cancelled") {
              setActiveNodeId(null);
              setRunStatus("cancelled");
            }

            if (event.event === "node" && event.nodeId && event.status) {
              if (event.status === "started") {
                setActiveNodeId(event.nodeId);
              } else {
                setActiveNodeId((current) =>
                  current === event.nodeId ? null : current
                );
              }

              setNodeStates((current) => ({
                ...current,
                [event.nodeId!]: {
                  label: event.label ?? event.nodeId!,
                  status: event.status!,
                  message: event.message,
                  output: event.output,
                },
              }));
            }

            if (event.event === "complete") {
              setResults(event.results ?? null);
              setRunStatus("completed");
            }
          }
        }

        if (!cancelled) {
          await fetchStatus(id);
        }
      } catch (streamError) {
        if (cancelled) return;
        setError(
          streamError instanceof Error
            ? streamError.message
            : "Stream connection failed"
        );
        setRunStatus("failed");
      }
    }

    void connect(runId);

    return () => {
      cancelled = true;
    };
  }, [runId, fetchStatus]);

  return { nodeStates, activeNodeId, runStatus, results, error, events };
}
