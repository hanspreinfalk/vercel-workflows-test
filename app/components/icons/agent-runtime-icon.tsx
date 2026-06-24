import { ClaudeCodeIcon } from "@/app/components/icons/claude-code-icon";
import { OpenCodeIcon } from "@/app/components/icons/open-code-icon";

type AgentRuntime = "claude-code" | "open-code";

export function AgentRuntimeIcon({
  runtime,
  className = "h-4 w-4",
}: {
  runtime: AgentRuntime;
  className?: string;
}) {
  if (runtime === "open-code") {
    return <OpenCodeIcon className={className} />;
  }

  return <ClaudeCodeIcon className={className} />;
}
