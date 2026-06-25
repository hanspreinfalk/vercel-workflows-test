"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  ChatInsight,
  ChatTranscript,
  ResearchDetailBar,
  ResearchDetailBody,
  ResearchMainEmpty,
  ResearchSegment,
  ResearchShell,
  ResearchStatus,
  ResearchThread,
} from "@/app/components/chatzy";
import { MobileBackButton } from "@/app/components/chatzy/mobile-back-button";
import { ChartCard, ProgressBars, VizBarChart } from "@/app/components/chatzy/charts";
import { WorkspacePage } from "@/app/components/workspace/layout/workspace-page";
import { useWorkspace } from "@/app/components/workspace/shell/workspace-context";
import { GenerateWorkflowButton } from "@/app/components/workspace/features/generate-workflow-button";
import { InterviewVisualPanel } from "@/app/components/workspace/features/interview-visual-panel";
import { listInterviews, listParticipants } from "@/lib/workspace/org-store";
import { getInterviewVisualMetrics, getOrgInterviewStats } from "@/lib/workspace/interview-analytics";
import type { Interview } from "@/lib/workspace/types";
import {
  formatDateTime,
  formatRelativeTime,
} from "@/lib/workspace/format";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | Interview["status"];

const statusLabel = {
  scheduled: "Scheduled",
  completed: "Completed",
  analyzing: "Analyzing",
} as const;

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "completed", label: "Done" },
  { value: "analyzing", label: "Analyzing" },
  { value: "scheduled", label: "Scheduled" },
];

export function InterviewsView() {
  const { orgId } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [detailTab, setDetailTab] = useState<
    "transcript" | "analysis" | "insights"
  >("transcript");

  const interviews = useMemo(() => listInterviews(orgId), [orgId]);
  const participants = useMemo(() => listParticipants(orgId), [orgId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return interviews
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => {
        if (!query) return true;
        const participant = participants.find((p) => p.id === item.participantId);
        return (
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          participant?.name.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [interviews, participants, search, statusFilter]);

  const selected = selectedId
    ? (filtered.find((item) => item.id === selectedId) ?? null)
    : null;

  const activeId = selected?.id ?? null;

  const selectedParticipant = selected
    ? participants.find((p) => p.id === selected.participantId)
    : null;

  const visualMetrics = useMemo(
    () => (selected ? getInterviewVisualMetrics(selected) : null),
    [selected]
  );

  const orgStats = useMemo(() => getOrgInterviewStats(interviews), [interviews]);

  const selectedThemes = selected?.themes ?? [];

  const sidebarMeta =
    interviews.length === 0
      ? "No interviews yet"
      : `${interviews.length} conversation${interviews.length === 1 ? "" : "s"}`;

  return (
    <WorkspacePage className="overflow-hidden p-0 sm:p-0">
      <ResearchShell
        detailOpen={Boolean(selected)}
        title="Interviews"
        meta={sidebarMeta}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search…",
          icon: <Search className="size-4" />,
        }}
        filters={
          <>
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "chatzy-chip",
                  statusFilter === value && "chatzy-chip--active"
                )}
              >
                {label}
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
            filtered.map((interview) => {
              const participant = participants.find(
                (p) => p.id === interview.participantId
              );
              return (
                <ResearchThread
                  key={interview.id}
                  active={interview.id === activeId}
                  onClick={() => {
                    setSelectedId(interview.id);
                    setDetailTab("transcript");
                  }}
                  title={interview.title}
                  preview={interview.summary}
                  meta={`${participant?.name ?? "Unknown"} · ${formatRelativeTime(interview.createdAt)}`}
                />
              );
            })
          )
        }
      >
        {!selected ? (
          interviews.length === 0 ? (
            <ResearchMainEmpty
              title="Select an interview"
              description="Pick a conversation from the sidebar to read the transcript or AI analysis."
            />
          ) : (
            <ResearchDetailBody>
              <div className="research-detail-hero">
                <h2 className="research-detail-hero__title">Interview analytics</h2>
                <p className="research-detail-hero__meta">
                  {interviews.length} conversations · themes and status across the org
                </p>
              </div>
              <div className="viz-grid">
                <ChartCard title="Interview status" subtitle="Research pipeline">
                  <VizBarChart data={orgStats.byStatus} height={200} />
                </ChartCard>
                {orgStats.themes.length > 0 ? (
                  <ChartCard title="Top themes" subtitle="Most common friction areas">
                    <VizBarChart
                      data={orgStats.themes}
                      layout="horizontal"
                      height={Math.max(140, orgStats.themes.length * 36)}
                    />
                  </ChartCard>
                ) : null}
                <ChartCard title="Research maturity" subtitle="Coverage signals">
                  <ProgressBars
                    items={[
                      {
                        label: "Completed interviews",
                        value: Math.min(
                          100,
                          (orgStats.byStatus.find((s) => s.name === "Completed")?.value ??
                            0) * 25
                        ),
                      },
                      {
                        label: "Theme diversity",
                        value: Math.min(100, orgStats.themes.length * 18),
                      },
                      {
                        label: "Ready for assessment",
                        value: Math.min(100, interviews.length * 22 + 15),
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
              subtitle={`${formatDateTime(selected.createdAt)} · ${selected.durationMin} min`}
              leading={
                <MobileBackButton onClick={() => setSelectedId(null)} />
              }
              trailing={
                <div className="flex items-center gap-3">
                  <ResearchStatus
                    status={selected.status}
                    label={statusLabel[selected.status]}
                  />
                  <ResearchSegment
                    tabs={[
                      { id: "transcript", label: "Transcript" },
                      { id: "analysis", label: "Analysis" },
                      { id: "insights", label: "Insights" },
                    ]}
                    active={detailTab}
                    onChange={(id) =>
                      setDetailTab(id as "transcript" | "analysis" | "insights")
                    }
                  />
                </div>
              }
            />

            <ResearchDetailBody>
              <div className="research-detail-hero">
                <h2 className="research-detail-hero__title">{selected.title}</h2>
                <p className="research-detail-hero__meta">
                  {selectedParticipant?.role ?? "Team member"}
                  {selectedThemes.length > 0
                    ? ` · ${selectedThemes.length} themes identified`
                    : null}
                </p>
                {selectedThemes.length > 0 ? (
                  <div className="research-detail-hero__tags">
                    {selectedThemes.map((theme) => (
                      <span key={theme} className="chatzy-tag">
                        {theme}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {detailTab === "transcript" ? (
                <ChatTranscript text={selected.transcriptPreview} />
              ) : detailTab === "analysis" ? (
                <div className="chatzy-thread">
                  <div className="chatzy-bubble chatzy-bubble--assistant whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
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
                              className="workspace-btn-ghost rounded-full px-4 py-2 text-sm"
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
            </ResearchDetailBody>
          </>
        )}
      </ResearchShell>
    </WorkspacePage>
  );
}
