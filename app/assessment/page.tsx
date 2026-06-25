import { AssessmentView } from "@/app/components/workspace/views/assessment-view";
import { WorkspaceShell } from "@/app/components/workspace/shell/workspace-shell";
import { getWorkspaceShellProps } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export default function AssessmentPage() {
  const shellProps = getWorkspaceShellProps();

  return (
    <WorkspaceShell {...shellProps} activeTab="assessment">
      <AssessmentView />
    </WorkspaceShell>
  );
}
