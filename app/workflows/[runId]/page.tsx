import { PageContainer } from "@/app/components/shell/site-header";
import { WorkflowViewer } from "@/app/components/workflow-viewer";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  return (
    <PageContainer>
      <div className="app-card overflow-hidden p-6 sm:p-8">
        <WorkflowViewer runId={runId} />
      </div>
    </PageContainer>
  );
}
