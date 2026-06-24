import { getAgentSession } from "@/lib/agent-session-store";
import { stopAgentSession } from "@/lib/agent-chat";
import { toSessionSummary } from "@/lib/claude-agent";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getAgentSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    session: toSessionSummary(session),
    messages: session.messages,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await stopAgentSession(id);
    return NextResponse.json({ stopped: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to stop session",
      },
      { status: 404 }
    );
  }
}
