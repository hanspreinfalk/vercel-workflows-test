import { FatalError, getWritable } from "workflow";
import { sleep } from "workflow";
import type { WorkflowProgressEvent } from "@/lib/legacy/workflow-progress";

async function emitProgress(
  event: Omit<WorkflowProgressEvent, "timestamp">
) {
  const writer = getWritable<string>().getWriter();
  await writer.write(
    JSON.stringify({ ...event, timestamp: Date.now() }) + "\n"
  );
  writer.releaseLock();
}

export async function handleUserSignup(email: string) {
  "use workflow";
  const user = await createUser(email);
  await sendWelcomeEmail(user);
  await markWaiting("5s");
  await sleep("5s");
  await sendOnboardingEmail(user);
  const result = { userId: user.id, status: "onboarded" as const };
  await markComplete(result);
  console.log(
    "Workflow is complete! Run 'npx workflow web' to inspect your run"
  );
  return result;
}

async function createUser(email: string) {
  "use step";
  await emitProgress({
    step: "create-user",
    status: "started",
    message: `Creating account for ${email}`,
  });
  console.log(`Creating user with email: ${email}`);
  const user = { id: crypto.randomUUID(), email };
  await emitProgress({
    step: "create-user",
    status: "completed",
    message: `Account created (${user.id.slice(0, 8)}…)`,
  });
  return user;
}

async function sendWelcomeEmail(user: { id: string; email: string }) {
  "use step";
  await emitProgress({
    step: "welcome-email",
    status: "started",
    message: "Sending welcome email…",
  });
  console.log(`Sending welcome email to user: ${user.id}`);
  if (Math.random() < 0.3) {
    await emitProgress({
      step: "welcome-email",
      status: "retrying",
      message: "Email provider unavailable — retrying automatically",
    });
    throw new Error("Retryable!");
  }
  await emitProgress({
    step: "welcome-email",
    status: "completed",
    message: "Welcome email delivered",
  });
}

async function markWaiting(duration: string) {
  "use step";
  await emitProgress({
    step: "wait",
    status: "started",
    message: `Waiting ${duration} before onboarding`,
  });
}

async function sendOnboardingEmail(user: { id: string; email: string }) {
  "use step";
  await emitProgress({
    step: "wait",
    status: "completed",
    message: "Cool-down finished",
  });
  await emitProgress({
    step: "onboarding-email",
    status: "started",
    message: "Sending onboarding email…",
  });
  if (!user.email.includes("@")) {
    await emitProgress({
      step: "onboarding-email",
      status: "failed",
      message: "Invalid email address",
    });
    throw new FatalError("Invalid Email");
  }
  console.log(`Sending onboarding email to user: ${user.id}`);
  await emitProgress({
    step: "onboarding-email",
    status: "completed",
    message: "Onboarding email delivered",
  });
}

async function markComplete(result: { userId: string; status: string }) {
  "use step";
  await emitProgress({
    step: "complete",
    status: "completed",
    message: "Signup workflow finished",
    result,
  });
}
