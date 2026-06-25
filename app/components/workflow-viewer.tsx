"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StartWorkflowButton } from "@/app/components/start-workflow-button";
import {
  parseProgressEvent,
  WORKFLOW_STEPS,
  type WorkflowProgressEvent,
  type WorkflowStepId,
  type WorkflowStepStatus,
} from "@/lib/legacy/workflow-progress";

type StepState = {
  status: WorkflowStepStatus | "completed";
  message?: string;
};

type WorkflowViewerProps = {
  runId: string;
};

function stepIcon(status: StepState["status"]) {
  switch (status) {
    case "completed":
      return "✓";
    case "started":
      return "●";
    case "retrying":
      return "↻";
    case "failed":
      return "✕";
    default:
      return "○";
  }
}

function stepClasses(status: StepState["status"]) {
  switch (status) {
    case "completed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "started":
      return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 animate-pulse";
    case "retrying":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "failed":
      return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900";
  }
}

function applyEvent(
  steps: Record<WorkflowStepId, StepState>,
  event: WorkflowProgressEvent
) {
  const next = { ...steps };

  if (event.step === "complete") {
    return next;
  }

  const current = next[event.step];
  const rank: Record<StepState["status"], number> = {
    pending: 0,
    started: 1,
    retrying: 2,
    failed: 3,
    completed: 4,
  };

  if (rank[event.status] >= rank[current.status]) {
    next[event.step] = {
      status: event.status,
      message: event.message,
    };
  }

  return next;
}

export function WorkflowViewer({ runId }: WorkflowViewerProps) {
  const [steps, setSteps] = useState<Record<WorkflowStepId, StepState>>(() =>
    Object.fromEntries(
      WORKFLOW_STEPS.map((step) => [step.id, { status: "pending" as const }])
    ) as Record<WorkflowStepId, StepState>
  );
  const [logs, setLogs] = useState<WorkflowProgressEvent[]>([]);
  const [runStatus, setRunStatus] = useState<
    "connecting" | "running" | "completed" | "failed"
  >("connecting");
  const [result, setResult] = useState<{ userId: string; status: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const chunkIndex = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    const response = await fetch(`/api/signup/${runId}/status`);
    if (!response.ok) {
      throw new Error("Could not load workflow status");
    }

    const data = (await response.json()) as {
      status: string;
      result?: { userId: string; status: string };
    };

    if (data.status === "completed" && data.result) {
      setResult(data.result);
      setRunStatus("completed");
      return;
    }

    if (data.status === "failed" || data.status === "cancelled") {
      setRunStatus("failed");
      setError("The workflow did not complete successfully.");
    }
  }, [runId]);

  useEffect(() => {
    let cancelled = false;

    async function connect(startIndex = 0) {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(
          `/api/signup/${runId}/stream?startIndex=${startIndex}`,
          { signal: controller.signal }
        );

        if (!response.ok || !response.body) {
          throw new Error("Could not connect to workflow stream");
        }

        setRunStatus("running");
        setError(null);

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
            const event = parseProgressEvent(line);
            if (!event) continue;

            chunkIndex.current += 1;
            setLogs((current) => [...current, event]);

            if (event.step === "complete" && event.result) {
              setResult(event.result);
              setRunStatus("completed");
            } else {
              setSteps((current) => applyEvent(current, event));
            }
          }
        }

        if (!cancelled) {
          await fetchStatus();
        }
      } catch (streamError) {
        if (controller.signal.aborted || cancelled) return;
        setError(
          streamError instanceof Error
            ? streamError.message
            : "Stream connection failed"
        );
        setRunStatus("failed");
      }
    }

    connect(chunkIndex.current);

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [runId, fetchStatus]);

  const activeStep = useMemo(
    () =>
      WORKFLOW_STEPS.find(
        (step) =>
          steps[step.id].status === "started" ||
          steps[step.id].status === "retrying"
      )?.label ?? null,
    [steps]
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ← Back to home
          </Link>
          <StartWorkflowButton label="Start new workflow" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Signup workflow
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {runStatus === "completed"
              ? "You're onboarded"
              : runStatus === "failed"
                ? "Something went wrong"
                : "Setting up your account"}
          </h1>
          <p className="font-mono text-xs text-zinc-500">{runId}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Live progress
            </p>
            <p className="text-sm text-zinc-500">
              {activeStep
                ? `Currently: ${activeStep}`
                : runStatus === "completed"
                  ? "All steps finished"
                  : "Waiting for updates…"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              runStatus === "completed"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : runStatus === "failed"
                  ? "bg-red-500/10 text-red-700 dark:text-red-300"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
            }`}
          >
            {runStatus}
          </span>
        </div>

        <ol className="flex flex-col gap-4">
          {WORKFLOW_STEPS.map((step, index) => {
            const state = steps[step.id];
            return (
              <li key={step.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${stepClasses(state.status)}`}
                  >
                    {stepIcon(state.status)}
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 ? (
                    <div className="mt-2 h-full min-h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
                  ) : null}
                </div>
                <div className="pb-4 pt-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {step.label}
                  </p>
                  <p className="text-sm text-zinc-500">{step.description}</p>
                  {state.message ? (
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {state.message}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {result ? (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Workflow result
            </p>
            <p className="mt-1 font-mono text-sm text-emerald-700 dark:text-emerald-300">
              userId: {result.userId}
            </p>
            <p className="font-mono text-sm text-emerald-700 dark:text-emerald-300">
              status: {result.status}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Event log
        </p>
        <div className="max-h-64 overflow-y-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
          {logs.length === 0 ? (
            <p className="text-zinc-500">Waiting for workflow events…</p>
          ) : (
            logs.map((event, index) => (
              <p key={`${event.timestamp}-${index}`} className="py-1">
                <span className="text-zinc-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>{" "}
                [{event.step}] {event.status}: {event.message}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
