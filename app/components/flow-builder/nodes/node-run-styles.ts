export type NodeRunStatus = "started" | "completed" | "failed";

export function getNodeRunBorderClass(
  runStatus: NodeRunStatus | undefined,
  selected: boolean,
  _accent: "violet" | "emerald" | "red"
): string {
  if (runStatus === "completed") {
    return "border-[var(--brand)] ring-2 ring-[color-mix(in_oklab,var(--brand)_25%,transparent)]";
  }
  if (runStatus === "failed") {
    return "border-[var(--destructive)] ring-2 ring-[color-mix(in_oklab,var(--destructive)_25%,transparent)]";
  }
  if (selected) {
    return "border-[var(--brand)] ring-2 ring-[color-mix(in_oklab,var(--brand)_20%,transparent)]";
  }
  return "border-[var(--border)]";
}
