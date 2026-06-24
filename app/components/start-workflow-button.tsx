"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StartWorkflowButtonProps = {
  email?: string;
  label?: string;
  className?: string;
};

export function StartWorkflowButton({
  email,
  label = "Start new workflow",
  className = "",
}: StartWorkflowButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsStarting(true);
    setError(null);

    const workflowEmail = email ?? `demo-${Date.now()}@example.com`;

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: workflowEmail }),
      });

      const data = (await response.json()) as {
        runId?: string;
        error?: string;
      };

      if (!response.ok || !data.runId) {
        throw new Error(data.error ?? "Failed to start workflow");
      }

      router.push(`/workflows/${data.runId}`);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "Something went wrong"
      );
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isStarting}
        className={`inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300 ${className}`}
      >
        {isStarting ? "Starting…" : label}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
