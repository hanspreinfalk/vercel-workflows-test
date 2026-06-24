import { getRun } from "workflow/api";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get("startIndex");
  const startIndex = startIndexParam
    ? parseInt(startIndexParam, 10)
    : undefined;

  const run = getRun(runId);
  const stream = run.getReadable({ startIndex });
  const tailIndex = await stream.getTailIndex();

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "x-workflow-stream-tail-index": String(tailIndex),
    },
  });
}
