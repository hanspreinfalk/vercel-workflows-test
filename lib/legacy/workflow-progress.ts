export type WorkflowStepId =
  | "create-user"
  | "welcome-email"
  | "wait"
  | "onboarding-email";

export type WorkflowStepStatus =
  | "pending"
  | "started"
  | "completed"
  | "retrying"
  | "failed";

export type WorkflowProgressEvent = {
  step: WorkflowStepId | "complete";
  status: WorkflowStepStatus | "completed";
  message: string;
  timestamp: number;
  result?: { userId: string; status: string };
};

export const WORKFLOW_STEPS: {
  id: WorkflowStepId;
  label: string;
  description: string;
}[] = [
  {
    id: "create-user",
    label: "Create account",
    description: "Register your profile in the system",
  },
  {
    id: "welcome-email",
    label: "Welcome email",
    description: "Send your first confirmation message",
  },
  {
    id: "wait",
    label: "Cool-down period",
    description: "Pause before onboarding begins",
  },
  {
    id: "onboarding-email",
    label: "Onboarding email",
    description: "Deliver tips to get you started",
  },
];

export function parseProgressEvent(line: string): WorkflowProgressEvent | null {
  try {
    return JSON.parse(line) as WorkflowProgressEvent;
  } catch {
    return null;
  }
}
