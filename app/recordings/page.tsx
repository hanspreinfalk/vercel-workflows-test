import { RecordingsView } from "@/app/components/workspace/views/recordings-view";
import { WorkspaceShell } from "@/app/components/workspace/shell/workspace-shell";
import { getWorkspaceShellProps } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export default function RecordingsPage() {
  const shellProps = getWorkspaceShellProps();

  return (
    <WorkspaceShell flows={shellProps.flows} activeTab="recordings">
      <RecordingsView />
    </WorkspaceShell>
  );
}
