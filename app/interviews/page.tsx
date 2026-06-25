import { InterviewsView } from "@/app/components/workspace/views/interviews-view";
import { WorkspaceShell } from "@/app/components/workspace/shell/workspace-shell";
import { getWorkspaceShellProps } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export default function InterviewsPage() {
  const shellProps = getWorkspaceShellProps();

  return (
    <WorkspaceShell {...shellProps} activeTab="interviews">
      <InterviewsView />
    </WorkspaceShell>
  );
}
