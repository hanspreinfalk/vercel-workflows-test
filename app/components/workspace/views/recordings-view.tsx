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
  ChartCard,
  ProgressBars,
  VizBarChart,
} from "@/app/components/workspace/charts";
import { ParticipantCell } from "@/app/components/workspace/components/participant-cell";
import { SegmentTabs } from "@/app/components/workspace/components/segment-tabs";
import {
  WorkspaceEntityFilters,
  WorkspacePageHeading,
  WorkspaceTableEmptyState,
  WorkspaceTableFooter,
} from "@/app/components/workspace/components/workspace-entity-table";
import { RecordingVisualPanel } from "@/app/components/workspace/features/recording-visual-panel";
import { useParticipantMap } from "@/app/components/workspace/hooks/use-participant-map";
import { WorkspacePage } from "@/app/components/workspace/layout/workspace-page";
import { useWorkspace } from "@/app/components/workspace/shell/workspace-context";
import {
  formatDateTime,
  formatDurationLong,
  formatRelativeTime,
  formatTimelineOffset,
} from "@/lib/workspace/format";
import { listRecordingEvents } from "@/lib/workspace/recording-events";
import { formatRecordingEventLabel } from "@/lib/workspace/recording-event-label";
import { listRecordings } from "@/lib/workspace/org-store";
import {
  getOrgRecordingStats,
  getRecordingVisualMetrics,
} from "@/lib/workspace/recording-analytics";

type DetailTab = "overview" | "charts";

export function RecordingsView() {
  const { orgId } = useWorkspace();
  const { participants, participantById } = useParticipantMap(orgId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [participantFilter, setParticipantFilter] = useState("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const recordings = useMemo(() => listRecordings(orgId), [orgId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recordings
      .filter(
        (item) =>
          participantFilter === "all" ||
          item.participantId === participantFilter
      )
      .filter((item) => {
        if (!query) return true;
        const participant = participantById.get(item.participantId);
        return (
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          participant?.name.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.capturedAt - a.capturedAt);
  }, [recordings, participantById, search, participantFilter]);

  const selected = selectedId
    ? (recordings.find((item) => item.id === selectedId) ?? null)
    : null;

  const selectedParticipant = selected
    ? participantById.get(selected.participantId)
    : null;

  const previewEvents = useMemo(() => {
    if (!selected) return [];
    return listRecordingEvents(selected.id).slice(0, 4);
  }, [selected]);

  const eventCount = selected ? listRecordingEvents(selected.id).length : 0;

  const visualMetrics = useMemo(
    () => (selected ? getRecordingVisualMetrics(selected) : null),
    [selected]
  );

  const orgStats = useMemo(() => getOrgRecordingStats(recordings), [recordings]);

  const hasActiveFilters =
    search.trim() !== "" || participantFilter !== "all";

  function clearFilters() {
    setSearch("");
    setParticipantFilter("all");
  }

  function openRecording(id: string) {
    setSelectedId(id);
    setDetailTab("overview");
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeading
        title="Recordings"
        description={`${recordings.length} session${recordings.length === 1 ? "" : "s"} · ${orgStats.totalEvents} events captured`}
        action={
          recordings.length > 0 ? (
            <Link href="/assessment">
              <Button variant="outline" size="sm">
                View assessment report
              </Button>
            </Link>
          ) : undefined
        }
      />

      {recordings.length > 0 ? (
        <>
          <WorkspaceEntityFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search recordings…"
            participantFilter={participantFilter}
            onParticipantFilterChange={setParticipantFilter}
            participants={participants}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Participant</TableHead>
                  <TableHead className="min-w-[200px]">Session</TableHead>
                  <TableHead className="hidden md:table-cell">Duration</TableHead>
                  <TableHead className="hidden sm:table-cell">Events</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-32 text-center">
                      <WorkspaceTableEmptyState
                        message="No recordings match your filters"
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={clearFilters}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((recording) => {
                    const participant = participantById.get(
                      recording.participantId
                    );
                    const events = listRecordingEvents(recording.id).length;

                    return (
                      <TableRow
                        key={recording.id}
                        className="cursor-pointer"
                        data-state={
                          selectedId === recording.id ? "selected" : undefined
                        }
                        onClick={() => openRecording(recording.id)}
                      >
                        <TableCell>
                          <ParticipantCell participant={participant} />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <p className="line-clamp-1 text-sm font-medium text-foreground">
                            {recording.title}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {recording.summary}
                          </p>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {formatDurationLong(recording.durationSec)}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                          {events}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                          <span title={formatDateTime(recording.capturedAt)}>
                            {formatRelativeTime(recording.capturedAt)}
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
              total={recordings.length}
              noun="recordings"
            />
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No screen recordings yet. Sessions will appear here once captured.
        </div>
      )}

      {recordings.length > 0 && !selected ? (
        <section className="mt-8 flex flex-col gap-5">
          <h2 className="text-lg font-medium tracking-tight text-foreground">
            Session analytics
          </h2>
          <ChartCard
            title="Events across all sessions"
            subtitle="Aggregate activity breakdown"
          >
            <VizBarChart
              data={orgStats.byType}
              layout="horizontal"
              height={Math.max(160, orgStats.byType.length * 36)}
            />
          </ChartCard>
          <ChartCard title="Research coverage" subtitle="Session capture progress">
            <ProgressBars
              items={[
                {
                  label: "Sessions recorded",
                  value: Math.min(100, recordings.length * 25),
                },
                {
                  label: "Event density",
                  value: Math.min(
                    100,
                    Math.round(
                      orgStats.totalEvents / Math.max(recordings.length, 1)
                    )
                  ),
                },
                {
                  label: "Ready for assessment",
                  value: Math.min(100, recordings.length * 30 + 10),
                },
              ]}
            />
          </ChartCard>
        </section>
      ) : null}

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
                  {formatDateTime(selected.capturedAt)} ·{" "}
                  {formatDurationLong(selected.durationSec)}
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-2 pt-2 text-sm text-muted-foreground">
                  <span>{eventCount} events</span>
                </div>
              </SheetHeader>

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
                <SegmentTabs
                  tabs={[
                    { id: "overview" as const, label: "Overview" },
                    { id: "charts" as const, label: "Charts" },
                  ]}
                  active={detailTab}
                  onChange={setDetailTab}
                />
                <Link
                  href={`/recordings/${selected.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Open timeline
                </Link>
              </div>

              <div className="flex-1 px-4 py-4">
                {detailTab === "charts" && visualMetrics ? (
                  <RecordingVisualPanel metrics={visualMetrics} />
                ) : (
                  <div className="flex flex-col gap-6">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {selected.summary}
                    </p>

                    {previewEvents.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Recent activity
                        </p>
                        {previewEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center gap-3 rounded-xl bg-muted px-3.5 py-2.5 text-xs text-muted-foreground"
                          >
                            <span className="shrink-0 font-mono text-[10px]">
                              {formatTimelineOffset(event.offsetMs)}
                            </span>
                            <span className="min-w-0 truncate">
                              {formatRecordingEventLabel(event)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <Link
                      href={`/recordings/${selected.id}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "w-fit",
                      })}
                    >
                      View full session →
                    </Link>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </WorkspacePage>
  );
}
