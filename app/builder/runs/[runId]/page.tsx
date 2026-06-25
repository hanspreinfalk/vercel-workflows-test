import { FlowRunViewer } from "@/app/components/flow-builder/runs/flow-run-viewer";

export default async function BuilderRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  return <FlowRunViewer runId={runId} />;
}
