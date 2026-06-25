"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  InterviewStatusBadge,
} from "@/app/components/workspace/components/interview-status-badge";
import { ParticipantCell } from "@/app/components/workspace/components/participant-cell";
import { SegmentTabs } from "@/app/components/workspace/components/segment-tabs";
import {
  WorkspaceEntityFilters,
  WorkspacePageHeading,
  WorkspaceTableEmptyState,
  WorkspaceTableFooter,
} from "@/app/components/workspace/components/workspace-entity-table";
import {
  ChatInsight,
  ChatTranscript,
} from "@/app/components/workspace/features/chat-transcript";
import { GenerateWorkflowButton } from "@/app/components/workspace/features/generate-workflow-button";
import { InterviewVisualPanel } from "@/app/components/workspace/features/interview-visual-panel";
import { useParticipantMap } from "@/app/components/workspace/hooks/use-participant-map";
import { WorkspacePage } from "@/app/components/workspace/layout/workspace-page";
import { useWorkspace } from "@/app/components/workspace/shell/workspace-context";
import { getInterviewVisualMetrics } from "@/lib/workspace/interview-analytics";
import { listInterviews } from "@/lib/workspace/org-store";
import type { Interview } from "@/lib/workspace/types";
import { formatDateTime, formatRelativeTime } from "@/lib/workspace/format";

type StatusFilter = "all" | Interview["status"];
type DetailTab = "transcript" | "analysis" | "insights";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "analyzing", label: "Analyzing" },
  { value: "scheduled", label: "Scheduled" },
] as const;

export function InterviewsView() {
  const { orgId } = useWorkspace();
  const { participants, participantById } = useParticipantMap(orgId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [participantFilter, setParticipantFilter] = useState("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("transcript");

  const interviews = useMemo(() => listInterviews(orgId), [orgId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return interviews
      .filter(
        (item) =>
          participantFilter === "all" ||
          item.participantId === participantFilter
      )
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => {
        if (!query) return true;
        const participant = participantById.get(item.participantId);
        return (
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          participant?.name.toLowerCase().includes(query) ||
          participant?.role.toLowerCase().includes(query) ||
          (item.themes ?? []).some((t) => t.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [interviews, participantById, search, statusFilter, participantFilter]);

  const selected = selectedId
    ? (interviews.find((item) => item.id === selectedId) ?? null)
    : null;

  const selectedParticipant = selected
    ? participantById.get(selected.participantId)
    : null;

  const visualMetrics = useMemo(
    () => (selected ? getInterviewVisualMetrics(selected) : null),
    [selected]
  );

  const selectedThemes = selected?.themes ?? [];

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    participantFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setParticipantFilter("all");
  }

  function openInterview(id: string) {
    setSelectedId(id);
    setDetailTab("transcript");
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeading
        title="Interviews"
        description={`${interviews.length} conversation${interviews.length === 1 ? "" : "s"} across ${participants.length} participant${participants.length === 1 ? "" : "s"}`}
        action={
          <Link href="/assessment">
            <Button variant="outline" size="sm">
              View assessment report
            </Button>
          </Link>
        }
      />

      <WorkspaceEntityFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search interviews…"
        participantFilter={participantFilter}
        onParticipantFilterChange={setParticipantFilter}
        participants={participants}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) =>
          setStatusFilter(value as StatusFilter)
        }
        statusOptions={[...STATUS_FILTER_OPTIONS]}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Participant</TableHead>
              <TableHead className="min-w-[200px]">Interview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Duration</TableHead>
              <TableHead className="hidden lg:table-cell">Themes</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-32 text-center">
                  <WorkspaceTableEmptyState
                    message="No interviews match your filters"
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={clearFilters}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((interview) => {
                const participant = participantById.get(interview.participantId);
                const themes = interview.themes ?? [];

                return (
                  <TableRow
                    key={interview.id}
                    className="cursor-pointer"
                    data-state={
                      selectedId === interview.id ? "selected" : undefined
                    }
                    onClick={() => openInterview(interview.id)}
                  >
                    <TableCell>
                      <ParticipantCell participant={participant} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {interview.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {interview.summary}
                      </p>
                    </TableCell>
                    <TableCell>
                      <InterviewStatusBadge status={interview.status} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {interview.durationMin} min
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <ThemeTags themes={themes} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      <span title={formatDateTime(interview.createdAt)}>
                        {formatRelativeTime(interview.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <WorkspaceTableFooter
          showing={filtered.length}
          total={interviews.length}
          noun="interviews"
        />
      </div>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
          showCloseButton
        >
          {selected && selectedParticipant ? (
            <>
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selectedParticipant.name} · {selectedParticipant.role} ·{" "}
                  {formatDateTime(selected.createdAt)} · {selected.durationMin}{" "}
                  min
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <InterviewStatusBadge status={selected.status} />
                  {selectedThemes.map((theme) => (
                    <span
                      key={theme}
                      className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </SheetHeader>

              <div className="px-4 pt-4">
                <SegmentTabs
                  tabs={[
                    { id: "transcript" as const, label: "Transcript" },
                    { id: "analysis" as const, label: "Analysis" },
                    { id: "insights" as const, label: "Insights" },
                  ]}
                  active={detailTab}
                  onChange={setDetailTab}
                />
              </div>

              <div className="flex-1 px-4 py-4">
                {detailTab === "transcript" ? (
                  <ChatTranscript text={selected.transcriptPreview} />
                ) : detailTab === "analysis" ? (
                  <div className="flex flex-col gap-6">
                    <div className="rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {selected.analysisPreview}
                    </div>
                    {selected.status === "completed" ? (
                      <ChatInsight
                        label="Build a workflow"
                        action={
                          <>
                            {selected.recordingId ? (
                              <Link
                                href={`/recordings/${selected.recordingId}`}
                                className={buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                })}
                              >
                                View recording
                              </Link>
                            ) : null}
                            <GenerateWorkflowButton interviewId={selected.id} />
                          </>
                        }
                      >
                        Turn this research into an automation. The builder agent
                        will gather credentials, run the flow, and refine it from
                        real logs.
                      </ChatInsight>
                    ) : null}
                  </div>
                ) : visualMetrics ? (
                  <InterviewVisualPanel metrics={visualMetrics} />
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </WorkspacePage>
  );
}

function ThemeTags({ themes }: { themes: string[] }) {
  return (
    <div className="flex max-w-[220px] flex-wrap gap-1">
      {themes.slice(0, 3).map((theme) => (
        <span
          key={theme}
          className="inline-flex rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
        >
          {theme}
        </span>
      ))}
      {themes.length > 3 ? (
        <span className="text-[10px] text-muted-foreground">
          +{themes.length - 3}
        </span>
      ) : null}
    </div>
  );
}
