import { startAgentSession } from "@/lib/agent/chat";
import { listAgentSessions } from "@/lib/agent/session-store";
import {
  AgentConfigError,
  toSessionSummary,
  validateAgentPrompt,
} from "@/lib/agent/claude-agent";
import { SandboxConfigError } from "@/lib/sandbox/run-playground";

export const runtime = "nodejs";
export const maxDuration = 600;

function createEventStream(
  handler: (emit: (event: object) => void) => Promise<void>
) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        await handler(emit);
        controller.close();
      } catch (error) {
        if (error instanceof AgentConfigError || error instanceof SandboxConfigError) {
          emit({ type: "error", message: error.message });
          controller.close();
          return;
        }

        emit({
          type: "error",
          message:
            error instanceof Error ? error.message : "Agent execution failed",
        });
        controller.close();
      }
    },
  });
}

export async function GET() {
  const sessions = listAgentSessions().map(toSessionSummary);
  return Response.json({ sessions });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: unknown };
  const prompt = validateAgentPrompt(body.prompt);

  const stream = createEventStream(async (emit) => {
    await startAgentSession(prompt, emit);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
