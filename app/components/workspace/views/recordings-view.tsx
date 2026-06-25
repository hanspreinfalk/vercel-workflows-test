"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  ResearchDetailBar,
  ResearchDetailBody,
  ResearchMainEmpty,
  ResearchSegment,
  ResearchShell,
  ResearchThread,
} from "@/app/components/chatzy";
import { MobileBackButton } from "@/app/components/chatzy/mobile-back-button";
import { ChartCard, ProgressBars, VizBarChart } from "@/app/components/chatzy/charts";
import { RecordingVisualPanel } from "@/app/components/workspace/features/recording-visual-panel";
import { WorkspacePage } from "@/app/components/workspace/layout/workspace-page";
import { useWorkspace } from "@/app/components/workspace/shell/workspace-context";
import { listRecordingEvents } from "@/lib/workspace/recording-events";
import { listParticipants, listRecordings } from "@/lib/workspace/org-store";
import {
  getOrgRecordingStats,
  getRecordingVisualMetrics,
} from "@/lib/workspace/recording-analytics";
import {
  formatDurationLong,
  formatRelativeTime,
  formatTimelineOffset,
} from "@/lib/workspace/format";
import { cn } from "@/lib/utils";

export function RecordingsView() {
  const { orgId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [participantFilter, setParticipantFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "charts">("overview");

  const recordings = useMemo(() => listRecordings(orgId), [orgId]);
  const participants = useMemo(() => listParticipants(orgId), [orgId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recordings
      .filter(
        (item) =>
          participantFilter === "all" || item.participantId === participantFilter
      )
      .filter((item) => {
        if (!query) return true;
        const participant = participants.find((p) => p.id === item.participantId);
        return (
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          participant?.name.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.capturedAt - a.capturedAt);
  }, [recordings, participants, search, participantFilter]);

  const selected = selectedId
    ? (filtered.find((item) => item.id === selectedId) ?? null)
    : null;

  const activeId = selected?.id ?? null;

  const selectedParticipant = selected
    ? participants.find((p) => p.id === selected.participantId)
    : null;

  const previewEvents = useMemo(() => {
    if (!selected) return [];
    return listRecordingEvents(selected.id).slice(0, 4);
  }, [selected]);

  const eventCount = selected
    ? listRecordingEvents(selected.id).length
    : 0;

  const visualMetrics = useMemo(
    () => (selected ? getRecordingVisualMetrics(selected) : null),
    [selected]
  );

  const orgStats = useMemo(() => getOrgRecordingStats(recordings), [recordings]);

  const sidebarMeta =
    recordings.length === 0
      ? "No sessions yet"
      : `${recordings.length} session${recordings.length === 1 ? "" : "s"}`;

  return (
    <WorkspacePage className="overflow-hidden p-0 sm:p-0">
      <ResearchShell
        detailOpen={Boolean(selected)}
        title="Recordings"
        meta={sidebarMeta}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search…",
          icon: <Search className="size-4" />,
        }}
        filters={
          <>
            <button
              type="button"
              onClick={() => setParticipantFilter("all")}
              className={cn(
                "chatzy-chip",
                participantFilter === "all" && "chatzy-chip--active"
              )}
            >
              All
            </button>
            {participants.map((participant) => (
              <button
                key={participant.id}
                type="button"
                onClick={() => setParticipantFilter(participant.id)}
                className={cn(
                  "chatzy-chip",
                  participantFilter === participant.id && "chatzy-chip--active"
                )}
              >
                {participant.name.split(" ")[0]}
              </button>
            ))}
          </>
        }
        list={
          filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
              No matches
            </p>
          ) : (
            filtered.map((recording) => {
              const participant = participants.find(
                (p) => p.id === recording.participantId
              );
              const events = listRecordingEvents(recording.id).length;

              return (
                <ResearchThread
                  key={recording.id}
                  active={recording.id === activeId}
                  onClick={() => {
                    setSelectedId(recording.id);
                    setDetailTab("overview");
                  }}
                  title={recording.title}
                  preview={recording.summary}
                  meta={`${participant?.name ?? "Unknown"} · ${events} events · ${formatRelativeTime(recording.capturedAt)}`}
                />
              );
            })
          )
        }
      >
        {!selected ? (
          recordings.length === 0 ? (
            <ResearchMainEmpty
              title="Select a recording"
              description="Choose a session from the sidebar to preview captures and open the full timeline."
            />
          ) : (
            <ResearchDetailBody>
              <div className="research-detail-hero">
                <h2 className="research-detail-hero__title">Session analytics</h2>
                <p className="research-detail-hero__meta">
                  {recordings.length} sessions · {orgStats.totalEvents} total events captured
                </p>
              </div>
              <div className="viz-grid">
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
                          Math.round(orgStats.totalEvents / Math.max(recordings.length, 1))
                        ),
                      },
                      {
                        label: "Ready for assessment",
                        value: Math.min(100, recordings.length * 30 + 10),
                      },
                    ]}
                  />
                </ChartCard>
              </div>
            </ResearchDetailBody>
          )
        ) : (
          <>
            <ResearchDetailBar
              title={selectedParticipant?.name ?? "Participant"}
              subtitle={formatRelativeTime(selected.capturedAt)}
              leading={
                <MobileBackButton onClick={() => setSelectedId(null)} />
              }
              trailing={
                <div className="flex flex-wrap items-center gap-3">
                  <ResearchSegment
                    tabs={[
                      { id: "overview", label: "Overview" },
                      { id: "charts", label: "Charts" },
                    ]}
                    active={detailTab}
                    onChange={(id) => setDetailTab(id as "overview" | "charts")}
                  />
                  <Link
                    href={`/recordings/${selected.id}`}
                    className="workspace-btn-primary rounded-full px-4 py-2 text-sm font-medium transition"
                  >
                    Open timeline
                  </Link>
                </div>
              }
            />

            <ResearchDetailBody>
              {detailTab === "charts" && visualMetrics ? (
                <RecordingVisualPanel metrics={visualMetrics} />
              ) : (
              <div className="research-recording-preview">
                <div className="research-detail-hero">
                  <h2 className="research-detail-hero__title">
                    {selected.title}
                  </h2>
                  <div className="research-recording-stats">
                    <span>
                      <strong>{eventCount}</strong> events
                    </span>
                    <span>
                      <strong>{formatDurationLong(selected.durationSec)}</strong>{" "}
                      captured
                    </span>
                    {selectedParticipant?.role ? (
                      <span>{selectedParticipant.role}</span>
                    ) : null}
                  </div>
                </div>

                <p className="research-recording-preview__summary">
                  {selected.summary}
                </p>

                {previewEvents.length > 0 ? (
                  <div className="research-recording-events">
                    <p className="research-recording-events__label">
                      Recent activity
                    </p>
                    {previewEvents.map((event) => (
                      <div key={event.id} className="research-event-snippet">
                        <span className="research-event-snippet__time">
                          {formatTimelineOffset(event.offsetMs)}
                        </span>
                        <span className="min-w-0 truncate">
                          {event.type === "screenshot"
                            ? event.windowTitle
                            : event.type === "click"
                              ? `Click · ${event.target}`
                              : event.type === "app_switch"
                                ? `${event.fromApp} → ${event.toApp}`
                                : event.type === "keystroke"
                                  ? `Typed in ${event.appName}`
                                  : event.type === "shortcut"
                                    ? event.keys
                                    : `Scroll · ${event.appName}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <Link
                  href={`/recordings/${selected.id}`}
                  className="workspace-btn-ghost inline-flex w-fit rounded-full px-5 py-2.5 text-sm font-medium"
                >
                  View full session →
                </Link>
              </div>
              )}
            </ResearchDetailBody>
          </>
        )}
      </ResearchShell>
    </WorkspacePage>
  );
}
