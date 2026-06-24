import { WorkflowViewer } from "@/app/components/workflow-viewer";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <WorkflowViewer runId={runId} />
    </div>
  );
}
