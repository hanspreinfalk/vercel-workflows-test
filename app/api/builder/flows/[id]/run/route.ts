import { start } from "workflow/api";
import { isAgentNode } from "@/lib/agent/node-utils";
import { getFlow } from "@/lib/flow/store";
import { registerFlowRunWithPersistence } from "@/lib/flow/run-cancel";
import type { FlowEdge, FlowNode, FlowRunSnapshot } from "@/lib/flow/types";
import { executeBuiltFlow } from "@/workflows/built-flow";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stored = getFlow(id);

  const body = (await request.json()) as {
    name?: string;
    nodes?: FlowNode[];
    edges?: FlowEdge[];
  };

  const nodes = body.nodes ?? stored?.nodes;
  const edges = body.edges ?? stored?.edges;

  if (!nodes?.length) {
    return NextResponse.json(
      { error: "Flow must contain at least one node" },
      { status: 400 }
    );
  }

  const snapshot: FlowRunSnapshot = {
    flowId: id,
    flowName: body.name ?? stored?.name ?? "Untitled flow",
    nodes,
    edges: edges ?? [],
  };

  const run = await start(executeBuiltFlow, [snapshot]);
  const agentNodeIds = snapshot.nodes
    .filter((node) => isAgentNode(node))
    .map((node) => node.id);
  registerFlowRunWithPersistence(run.runId, agentNodeIds);

  return NextResponse.json({
    message: "Flow execution started",
    runId: run.runId,
    flowId: id,
  });
}
