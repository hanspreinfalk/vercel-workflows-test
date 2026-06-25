import { ParticipantsView } from "@/app/components/workspace/views/participants-view";
import { WorkspaceShell } from "@/app/components/workspace/shell/workspace-shell";
import { getWorkspaceShellProps } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export default function ParticipantsPage() {
  const shellProps = getWorkspaceShellProps();

  return (
    <WorkspaceShell {...shellProps} activeTab="participants">
      <ParticipantsView />
    </WorkspaceShell>
  );
}
