"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HierarchyStrip,
  WorkspacePage,
  WorkspacePageHeader,
} from "@/app/components/workspace/layout/workspace-page";
import { WorkspaceCard } from "@/app/components/workspace/layout/workspace-card";
import { useWorkspace } from "@/app/components/workspace/shell/workspace-context";
import { listParticipants } from "@/lib/workspace/org-store";
import { formatRelativeTime, initials } from "@/lib/workspace/format";

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
          <WorkspaceCard key={participant.id} className="p-5">
            <div className="flex items-start gap-3">
              <Avatar size="default">
                <AvatarFallback className="bg-brand/10 text-brand text-sm font-medium">
                  {initials(participant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-medium">
                  {participant.name}
                </h3>
                <p className="truncate text-sm text-muted-foreground">
                  {participant.role}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {participant.email}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
              <Stat value={String(participant.interviewCount)} label="Interviews" />
              <Stat value={String(participant.recordingCount)} label="Recordings" />
              <Stat
                value={formatRelativeTime(participant.lastActiveAt)}
                label="Active"
                small
              />
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/interviews"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "flex-1",
                })}
              >
                Interviews
              </Link>
              <Link
                href="/recordings"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "flex-1",
                })}
              >
                Recordings
              </Link>
            </div>
          </WorkspaceCard>
        ))}
      </div>
    </WorkspacePage>
  );
}

function Stat({
  value,
  label,
  small,
}: {
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={
          small
            ? "text-sm font-semibold tabular-nums text-foreground"
            : "text-lg font-semibold tabular-nums text-foreground"
        }
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
