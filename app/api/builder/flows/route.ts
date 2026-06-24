import { createFlow, listFlows } from "@/lib/flow-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ flows: listFlows() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string };
  const flow = createFlow(body.name);
  return NextResponse.json({ flow });
}
