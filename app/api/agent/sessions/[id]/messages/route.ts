import { continueAgentSession } from "@/lib/agent-chat";
import {
  AgentConfigError,
  validateAgentPrompt,
} from "@/lib/claude-agent";
import { SandboxConfigError } from "@/lib/run-in-sandbox";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as { prompt?: unknown };
  const prompt = validateAgentPrompt(body.prompt);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        await continueAgentSession(id, prompt, emit);
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

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
