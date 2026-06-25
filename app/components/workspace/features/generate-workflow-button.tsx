"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Workflow } from "lucide-react";

type GenerateWorkflowButtonProps = {
  interviewId?: string;
  recordingId?: string;
  label?: string;
  className?: string;
};

export function GenerateWorkflowButton({
  interviewId,
  recordingId,
  label = "Build automation workflow",
  className = "workspace-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60",
}: GenerateWorkflowButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workspace/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, recordingId }),
      });

      const data = (await response.json()) as {
        flowId?: string;
        bootstrapMessage?: string;
        error?: string;
      };

      if (!response.ok || !data.flowId) {
        throw new Error(data.error ?? "Failed to generate workflow");
      }

      if (data.bootstrapMessage) {
        sessionStorage.setItem(
          `flow-bootstrap-${data.flowId}`,
          data.bootstrapMessage
        );
      }

      router.push(`/builder/${data.flowId}`);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate workflow"
      );
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isLoading}
        className={className}
      >
        <Workflow className="size-4" />
        {isLoading ? "Creating workflow…" : label}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
