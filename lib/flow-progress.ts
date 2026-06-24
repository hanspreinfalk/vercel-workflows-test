export type BuiltFlowProgressEvent = {
  event: "node" | "complete" | "log" | "cancelled";
  nodeId?: string;
  label?: string;
  status?: "started" | "completed" | "failed";
  level?: "info" | "warn" | "error";
  message: string;
  output?: string;
  results?: Record<string, string>;
  timestamp: number;
};

export function parseBuiltFlowProgressEvent(
  line: string
): BuiltFlowProgressEvent | null {
  try {
    return JSON.parse(line) as BuiltFlowProgressEvent;
  } catch {
    return null;
  }
}
