"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  parseAgentEvent,
  type AgentProgressEvent,
} from "@/lib/claude-agent";

const DEFAULT_PROMPT =
  "Create a file called hello.js that prints the first 10 prime numbers, run it with Node.js, and tell me the output.";

type StepState = {
  status: "pending" | "started" | "completed" | "failed";
  message?: string;
  durationMs?: number;
};

const STEP_ORDER = ["sandbox", "install", "workspace", "agent"] as const;

const STEP_LABELS: Record<(typeof STEP_ORDER)[number], string> = {
  sandbox: "Create sandbox",
  install: "Install Claude Code",
  workspace: "Prepare workspace",
  agent: "Run agent",
};

export function ClaudeAgentPlayground() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [steps, setSteps] = useState<Record<string, StepState>>(() =>
    Object.fromEntries(STEP_ORDER.map((step) => [step, { status: "pending" }]))
  );
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const activeStep = useMemo(
    () => STEP_ORDER.find((step) => steps[step]?.status === "started") ?? null,
    [steps]
  );

  function applyEvent(event: AgentProgressEvent) {
    if (event.type === "step") {
      setSteps((current) => ({
        ...current,
        [event.step]: {
          status: event.status,
          message: event.message,
          durationMs: event.durationMs,
        },
      }));
      return;
    }

    if (event.type === "log") {
      if (event.stream === "stdout") {
        setStdout((current) => current + event.text);
      } else {
        setStderr((current) => current + event.text);
      }
      return;
    }

    if (event.type === "complete") {
      setSandboxId(event.sandboxId);
      setStdout(event.stdout);
      setStderr(event.stderr);
      setDurationMs(event.durationMs);
      return;
    }

    if (event.type === "error") {
      setError(event.message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStdout("");
    setStderr("");
    setSandboxId(null);
    setDurationMs(null);
    setSteps(
      Object.fromEntries(STEP_ORDER.map((step) => [step, { status: "pending" }]))
    );
    setIsRunning(true);

    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Could not start Claude agent");
      }

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
          if (event) applyEvent(event);
        }
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong"
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Agent prompt
          </p>
          <p className="text-sm text-zinc-500">
            Claude Code runs inside a Vercel Sandbox microVM with network access
            and can create files, run shell commands, and edit code.
          </p>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={6}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100 outline-none ring-violet-500 focus:ring-2 dark:border-zinc-800"
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPrompt(DEFAULT_PROMPT)}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            Reset example
          </button>
          <button
            type="submit"
            disabled={isRunning}
            className="flex h-11 items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? "Agent running…" : "Run Claude Code"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Execution steps
          </p>
          {activeStep ? (
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
              {STEP_LABELS[activeStep]}
            </span>
          ) : null}
          {durationMs ? (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              {Math.round(durationMs / 1000)}s total
            </span>
          ) : null}
          {sandboxId ? (
            <span className="font-mono text-xs text-zinc-500">{sandboxId}</span>
          ) : null}
        </div>

        <ol className="grid gap-3 sm:grid-cols-2">
          {STEP_ORDER.map((step) => {
            const state = steps[step];
            return (
              <li
                key={step}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {STEP_LABELS[step]}
                  </p>
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    {state.status}
                  </span>
                </div>
                {state.message ? (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {state.message}
                  </p>
                ) : null}
                {state.durationMs ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    {state.durationMs} ms
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Agent output
          </p>
          <pre className="min-h-48 overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-6 text-emerald-300">
            {stdout || (isRunning ? "Waiting for Claude Code…" : "(empty)")}
          </pre>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            stderr
          </p>
          <pre className="min-h-48 overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-6 text-amber-300">
            {stderr || "(empty)"}
          </pre>
        </div>
      </div>
    </form>
  );
}
