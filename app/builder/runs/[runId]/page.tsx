import { SiteHeader } from "@/app/components/site-header";
import { FlowRunViewer } from "@/app/components/flow-builder/flow-run-viewer";

export default async function BuilderRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader active="builder" />
      <FlowRunViewer runId={runId} />
    </div>
  );
}
