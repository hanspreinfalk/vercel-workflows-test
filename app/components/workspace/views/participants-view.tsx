"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/app/components/shared/button";
import {
  HierarchyStrip,
  MagicCard,
  WorkspacePage,
  WorkspacePageHeader,
} from "@/app/components/workspace/layout/workspace-page";
import { useWorkspace } from "@/app/components/workspace/shell/workspace-context";
import { listParticipants } from "@/lib/workspace/org-store";

function formatRelativeTime(timestamp: number) {
  const hours = Math.round((Date.now() - timestamp) / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ParticipantsView() {
  const { orgId, organizations } = useWorkspace();
  const org = organizations.find((item) => item.id === orgId);

  const participants = useMemo(() => listParticipants(orgId), [orgId]);

  return (
    <WorkspacePage>
      <HierarchyStrip
        items={[
          { label: org?.name ?? "Organization", active: true },
          { label: "Participants", active: true },
        ]}
      />
      <WorkspacePageHeader
        eyebrow="People in your org"
        title="Participants"
        description="Each participant can have interviews with transcripts and AI analysis, plus screen recordings of their work."
        action={<Button>Add participant</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <MagicCard key={participant.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="chatzy-bubble-avatar chatzy-bubble-avatar--brand h-11 w-11 text-sm">
                {initials(participant.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-medium">{participant.name}</h3>
                <p className="truncate text-sm text-[var(--text-secondary)]">
                  {participant.role}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                  {participant.email}
                </p>
              </div>
            </div>

            <div className="chatzy-mini-stats">
              <div className="chatzy-mini-stat">
                <p className="chatzy-mini-stat__value">{participant.interviewCount}</p>
                <p className="chatzy-mini-stat__label">Interviews</p>
              </div>
              <div className="chatzy-mini-stat">
                <p className="chatzy-mini-stat__value">{participant.recordingCount}</p>
                <p className="chatzy-mini-stat__label">Recordings</p>
              </div>
              <div className="chatzy-mini-stat">
                <p className="chatzy-mini-stat__value text-sm">
                  {formatRelativeTime(participant.lastActiveAt)}
                </p>
                <p className="chatzy-mini-stat__label">Active</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/interviews"
                className="ui-btn-ghost flex-1 rounded-full py-2.5 text-center text-xs font-medium"
              >
                Interviews
              </Link>
              <Link
                href="/recordings"
                className="ui-btn-ghost flex-1 rounded-full py-2.5 text-center text-xs font-medium"
              >
                Recordings
              </Link>
            </div>
          </MagicCard>
        ))}
      </div>
    </WorkspacePage>
  );
}
