"use client";

import Link from "next/link";
import { useFlowRunStream } from "./use-flow-run-stream";

export function FlowRunViewer({ runId }: { runId: string }) {
  const { nodeStates, runStatus, results, error, events } =
    useFlowRunStream(runId);

  const nodeList = Object.entries(nodeStates);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/builder"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ← Back to builder
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Flow run
          </h1>
          <p className="font-mono text-xs text-zinc-500">{runId}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            runStatus === "completed"
              ? "bg-emerald-500/10 text-emerald-700"
              : runStatus === "failed"
                ? "bg-red-500/10 text-red-700"
                : "bg-blue-500/10 text-blue-700"
          }`}
        >
          {runStatus}
        </span>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="mb-4 text-sm font-medium">Executed via Vercel Workflows</p>
        {nodeList.length === 0 ? (
          <p className="text-sm text-zinc-500">Waiting for node events…</p>
        ) : (
          <ol className="space-y-4">
            {nodeList.map(([nodeId, node]) => (
              <li
                key={nodeId}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{node.label}</p>
                  <span className="text-xs uppercase text-zinc-500">
                    {node.status}
                  </span>
                </div>
                {node.message ? (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {node.message}
                  </p>
                ) : null}
                {node.output ? (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs leading-5 text-emerald-300">
                    {node.output}
                  </pre>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      {results ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
          Flow completed with {Object.keys(results).length} node outputs.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {events.length > 0 ? (
        <details className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium">
            Raw workflow events ({events.length})
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto text-xs text-zinc-500">
            {JSON.stringify(events, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
