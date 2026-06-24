import {
  streamFlowBuilderChat,
  type FlowBuilderChatContext,
  type FlowBuilderChatMessage,
} from "@/lib/flow-builder-chat";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;

  const body = (await request.json()) as {
    messages?: FlowBuilderChatMessage[];
    flow?: FlowBuilderChatContext;
  };

  const messages = body.messages ?? [];
  const flow = body.flow;

  if (!flow?.nodes?.length) {
    return Response.json(
      { error: "Flow context is required" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const result = await streamFlowBuilderChat({
          messages,
          flow,
          onToken: (token) => {
            emit({ type: "token", token });
          },
        });

        emit({
          type: "done",
          content: result.content,
          actions: result.actions,
        });
        controller.close();
      } catch (error) {
        emit({
          type: "error",
          message:
            error instanceof Error ? error.message : "Chat request failed",
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
