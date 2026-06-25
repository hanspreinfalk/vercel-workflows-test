import { Badge } from "@/components/ui/badge";
import type { Interview } from "@/lib/workspace/types";

const STATUS_LABEL: Record<Interview["status"], string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  analyzing: "Analyzing",
};

export function interviewStatusBadgeVariant(
  status: Interview["status"]
): "default" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "analyzing") return "secondary";
  return "outline";
}

export function InterviewStatusBadge({ status }: { status: Interview["status"] }) {
  return (
    <Badge variant={interviewStatusBadgeVariant(status)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export { STATUS_LABEL as interviewStatusLabel };
