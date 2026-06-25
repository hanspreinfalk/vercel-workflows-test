import { NextResponse } from "next/server";
import { listRecordingEvents } from "@/lib/workspace/recording-events";
import {
  getParticipant,
  getRecording,
  listInterviews,
} from "@/lib/workspace/org-store";
import {
  buildResearchBootstrapMessage,
  createFlowFromResearch,
} from "@/lib/workspace/workflow-from-research";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    interviewId?: string;
    recordingId?: string;
  };

  const interview =
    body.interviewId != null
      ? listInterviews("org-demo").find((item) => item.id === body.interviewId)
      : undefined;

  const recording =
    body.recordingId != null
      ? getRecording(body.recordingId)
      : interview?.recordingId
        ? getRecording(interview.recordingId)
        : null;

  if (!interview && !recording) {
    return NextResponse.json(
      { error: "interviewId or recordingId is required" },
      { status: 400 }
    );
  }

  const resolvedInterview =
    interview ??
    (recording
      ? listInterviews("org-demo").find((item) => item.recordingId === recording.id)
      : undefined);

  if (!resolvedInterview) {
    return NextResponse.json(
      { error: "Could not resolve interview for this recording" },
      { status: 404 }
    );
  }

  const participant = getParticipant(resolvedInterview.participantId);
  const events = recording ? listRecordingEvents(recording.id) : [];

  const flow = createFlowFromResearch({
    interview: resolvedInterview,
    recording,
    events,
    participant,
  });

  const bootstrapMessage = buildResearchBootstrapMessage({
    interview: resolvedInterview,
    recording,
    events,
    participant,
  });

  return NextResponse.json({
    flowId: flow.id,
    bootstrapMessage,
  });
}
