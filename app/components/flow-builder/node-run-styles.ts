export type NodeRunStatus = "started" | "completed" | "failed";

export function getNodeRunBorderClass(
  runStatus: NodeRunStatus | undefined,
  selected: boolean,
  accent: "violet" | "emerald" | "red"
): string {
  if (runStatus === "completed") {
    return "border-emerald-500 ring-2 ring-emerald-500/25";
  }
  if (runStatus === "failed") {
    return "border-red-500 ring-2 ring-red-500/30";
  }
  if (selected) {
    if (accent === "emerald") {
      return "border-emerald-500 ring-2 ring-emerald-500/20";
    }
    if (accent === "red") {
      return "border-red-500 ring-2 ring-red-500/20";
    }
    return "border-violet-500 ring-2 ring-violet-500/20";
  }
  return "border-zinc-200 dark:border-zinc-800";
}
