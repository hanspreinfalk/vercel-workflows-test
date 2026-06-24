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
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            JavaScript code
          </p>
          <p className="text-sm text-zinc-500">
            Runs in an isolated Vercel Sandbox microVM with network access
            disabled.
          </p>
        </div>

        <textarea
          value={code}
          onChange={(event) => setCode(event.target.value)}
          spellCheck={false}
          rows={14}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-100 outline-none ring-blue-500 focus:ring-2 dark:border-zinc-800"
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setCode(DEFAULT_CODE)}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            Reset example
          </button>
          <button
            type="submit"
            disabled={isRunning}
            className="flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
          >
            {isRunning ? "Running in sandbox…" : "Run in sandbox"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                result.exitCode === 0
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 text-red-700 dark:text-red-300"
              }`}
            >
              exit {result.exitCode}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              {result.durationMs} ms
            </span>
            <span className="font-mono text-xs text-zinc-500">
              {result.sandboxId}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                stdout
              </p>
              <pre className="min-h-32 overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-6 text-emerald-300">
                {result.stdout || "(empty)"}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                stderr
              </p>
              <pre className="min-h-32 overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-6 text-amber-300">
                {result.stderr || "(empty)"}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
