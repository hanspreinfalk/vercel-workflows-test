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
        className={`workspace-btn-primary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {isStarting ? "Starting…" : label}
      </button>
      {error ? (
        <p className="text-sm text-[var(--destructive)]">{error}</p>
      ) : null}
    </div>
  );
}
