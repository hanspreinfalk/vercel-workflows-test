import { getRun } from "workflow/api";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  try {
    const run = getRun(runId);
    const status = await run.status;

    if (status === "completed") {
      const result = await run.returnValue;
      return NextResponse.json({ runId, status, result });
    }

    return NextResponse.json({ runId, status });
  } catch {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
}
