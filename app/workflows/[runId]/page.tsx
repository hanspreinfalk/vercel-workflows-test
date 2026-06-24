import { SiteHeader } from "@/app/components/site-header";
import { WorkflowViewer } from "@/app/components/workflow-viewer";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader active="workflow" />
      <WorkflowViewer runId={runId} />
    </div>
  );
}
