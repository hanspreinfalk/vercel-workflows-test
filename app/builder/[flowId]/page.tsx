import { notFound } from "next/navigation";
import { FlowBuilder } from "@/app/components/flow-builder";
import { listFlows } from "@/lib/flow/store";
import { getWorkspaceShellProps } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export default async function BuilderFlowPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  const shellProps = getWorkspaceShellProps();
  const flow = listFlows().find((item) => item.id === flowId);

  if (!flow) {
    notFound();
  }

  return (
    <FlowBuilder
      initialFlow={flow}
      flows={shellProps.flows}
    />
  );
}
