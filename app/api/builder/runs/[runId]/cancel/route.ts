import { cancelFlowRun } from "@/lib/flow-run-cancel";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  try {
    await cancelFlowRun(runId);
    return NextResponse.json({ runId, cancelled: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to stop workflow",
      },
      { status: 500 }
    );
  }
}
