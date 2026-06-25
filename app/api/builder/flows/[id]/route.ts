import { deleteFlow, getFlow, saveFlow } from "@/lib/flow/store";
import type { FlowEdge, FlowNode } from "@/lib/flow/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const flow = getFlow(id);

  if (!flow) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  return NextResponse.json({ flow });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = getFlow(id);

  if (!existing) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    nodes?: FlowNode[];
    edges?: FlowEdge[];
  };

  const flow = saveFlow({
    id,
    name: body.name ?? existing.name,
    nodes: body.nodes ?? existing.nodes,
    edges: body.edges ?? existing.edges,
  });

  return NextResponse.json({ flow });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteFlow(id);
  return NextResponse.json({ deleted: true });
}
