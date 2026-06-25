import { createDemoWorkspaceStore } from "@/lib/workspace/fixtures/demo-data";
import type {
  Interview,
  Organization,
  Participant,
  ScreenRecording,
} from "@/lib/workspace/types";

const globalStore = globalThis as typeof globalThis & {
  __workspaceStore?: ReturnType<typeof createDemoWorkspaceStore>;
};

const store =
  globalStore.__workspaceStore ??
  (globalStore.__workspaceStore = createDemoWorkspaceStore());

export function listOrganizations(): Organization[] {
  return store.orgs;
}

export function getOrganization(orgId: string): Organization | null {
  return store.orgs.find((org) => org.id === orgId) ?? null;
}

export function listParticipants(orgId: string): Participant[] {
  return store.participants.filter((participant) => participant.orgId === orgId);
}

export function listInterviews(orgId: string): Interview[] {
  return store.interviews.filter((interview) => interview.orgId === orgId);
}

export function listRecordings(orgId: string): ScreenRecording[] {
  return store.recordings.filter((recording) => recording.orgId === orgId);
}

export function getRecording(recordingId: string): ScreenRecording | null {
  return store.recordings.find((recording) => recording.id === recordingId) ?? null;
}

export function getParticipant(participantId: string): Participant | null {
  return store.participants.find((p) => p.id === participantId) ?? null;
}

export function getDefaultOrganizationId(): string {
  return store.orgs[0]?.id ?? "org-demo";
}
