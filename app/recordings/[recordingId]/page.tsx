import { notFound } from "next/navigation";
import { RecordingDetailView } from "@/app/components/workspace/views/recording-detail-view";
import { WorkspaceShell } from "@/app/components/workspace/shell/workspace-shell";
import { getParticipant, getRecording } from "@/lib/workspace/org-store";
import { getWorkspaceShellProps } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export default async function RecordingDetailPage({
  params,
}: {
  params: Promise<{ recordingId: string }>;
}) {
  const { recordingId } = await params;
  const recording = getRecording(recordingId);

  if (!recording) {
    notFound();
  }

  const participant = getParticipant(recording.participantId);
  const shellProps = getWorkspaceShellProps();

  return (
    <WorkspaceShell flows={shellProps.flows}>
      <RecordingDetailView recording={recording} participant={participant} />
    </WorkspaceShell>
  );
}
