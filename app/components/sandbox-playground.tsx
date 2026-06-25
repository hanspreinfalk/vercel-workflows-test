"use client";

import { FormEvent, useState } from "react";

const DEFAULT_CODE = `function fibonacci(n) {
  const result = [0, 1];
  for (let i = 2; i < n; i++) {
    result.push(result[i - 1] + result[i - 2]);
  }
  return result;
}

console.log("First 10 Fibonacci numbers:");
console.log(fibonacci(10));`;

type SandboxRunResult = {
  sandboxId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export function SandboxPlayground() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState<SandboxRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsRunning(true);

    try {
      const response = await fetch("/api/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = (await response.json()) as SandboxRunResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Sandbox execution failed");
      }

      setResult(data);
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
      <div>
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            JavaScript code
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Runs in an isolated Vercel Sandbox microVM with network access
            disabled.
          </p>
        </div>

        <textarea
          value={code}
          onChange={(event) => setCode(event.target.value)}
          spellCheck={false}
          rows={14}
          className="w-full rounded-xl border border-[var(--border)] bg-[#0c0c0e] p-4 font-mono text-sm leading-6 text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setCode(DEFAULT_CODE)}
            className="text-sm text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          >
            Reset example
          </button>
          <button
            type="submit"
            disabled={isRunning}
            className="workspace-btn-primary flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isRunning ? "Running in sandbox…" : "Run in sandbox"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[var(--destructive)]/20 bg-[var(--destructive-soft)] p-4 text-sm text-[var(--destructive)]">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                result.exitCode === 0
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : "bg-[var(--destructive-soft)] text-[var(--destructive)]"
              }`}
            >
              exit {result.exitCode}
            </span>
            <span className="rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              {result.durationMs} ms
            </span>
            <span className="font-mono text-xs text-[var(--text-tertiary)]">
              {result.sandboxId}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                stdout
              </p>
              <pre className="min-h-32 overflow-x-auto rounded-xl bg-[#0c0c0e] p-4 font-mono text-xs leading-6 text-[var(--success)]">
                {result.stdout || "(empty)"}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                stderr
              </p>
              <pre className="min-h-32 overflow-x-auto rounded-xl bg-[#0c0c0e] p-4 font-mono text-xs leading-6 text-amber-400">
                {result.stderr || "(empty)"}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
