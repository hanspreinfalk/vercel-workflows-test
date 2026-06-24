import { notFound } from "next/navigation";
import { SiteHeader } from "@/app/components/site-header";
import { FlowBuilder } from "@/app/components/flow-builder/flow-builder";
import { getFlow } from "@/lib/flow-store";

export const dynamic = "force-dynamic";

export default async function BuilderFlowPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  const flow = getFlow(flowId);

  if (!flow) {
    notFound();
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader active="builder" />
      <FlowBuilder initialFlow={flow} />
    </div>
  );
}
