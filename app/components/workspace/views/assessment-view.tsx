"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  FileText,
  Sparkles,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";
import {
  ChartCard,
  ImpactEffortChart,
  ProgressBars,
  ScoreHero,
  VizBarChart,
  VizRadarChart,
} from "@/app/components/workspace/charts";
import { WorkspacePage } from "@/app/components/workspace/layout/workspace-page";
import { useWorkspace } from "@/app/components/workspace/shell/workspace-context";
import { GenerateWorkflowButton } from "@/app/components/workspace/features/generate-workflow-button";
import { buildOrgAssessment } from "@/lib/workspace/assessment";
import { formatDateTime, formatDurationLong, initials } from "@/lib/workspace/format";
import { cn } from "@/lib/utils";

const TOC = [
  { id: "executive", label: "Executive summary" },
  { id: "participants", label: "Participants" },
  { id: "interviews", label: "Interviews" },
  { id: "recordings", label: "Recordings" },
  { id: "health", label: "Org health" },
  { id: "bottlenecks", label: "Bottlenecks" },
  { id: "inefficiencies", label: "Inefficiencies" },
  { id: "automation", label: "Automation roadmap" },
  { id: "maturity", label: "Maturity & next steps" },
] as const;

function ReportSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-border pt-10 first:border-t-0 first:pt-0">
      <div className="mb-6">
        <h2 className="text-lg font-medium tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-[5.5rem] flex-col items-center rounded-lg border border-border bg-card px-3 py-2.5">
      <span
        className={cn(
          "text-lg font-semibold tabular-nums",
          accent ? "text-[var(--brand)]" : "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "completed"
      ? "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-[var(--brand)]"
      : status === "analyzing"
        ? "bg-muted text-foreground"
        : "bg-muted text-muted-foreground";

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", styles)}>
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: "interview" | "recording" | "both" }) {
  const label =
    source === "both" ? "Interview + recording" : source === "interview" ? "Interview" : "Recording";
  return (
    <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

export function AssessmentView() {
  const { orgId, organizations } = useWorkspace();
  const orgName = organizations.find((o) => o.id === orgId)?.name ?? "Organization";

  const report = useMemo(
    () => buildOrgAssessment(orgId, orgName),
    [orgId, orgName]
  );

  const recoverableHours = Math.round(report.totalRecoverableMinutes / 60);
  const weeklyHoursLost = report.bottlenecks.reduce((s, b) => s + b.hoursPerWeek, 0);

  return (
    <WorkspacePage className="overflow-hidden p-0 sm:p-0">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Table of contents — desktop sidebar */}
        <nav className="hidden shrink-0 border-r border-border bg-muted/30 lg:block lg:w-52 xl:w-56">
          <div className="sticky top-0 max-h-full overflow-y-auto p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Contents
            </p>
            <ul className="space-y-0.5">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Report body */}
        <article className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-8 pb-16 sm:px-6 sm:py-10 lg:px-8">
            {/* Cover */}
            <header className="border-b border-border pb-8">
              <p className="flex items-center gap-1.5 text-sm text-[var(--brand)]">
                <Sparkles className="size-4" />
                Process intelligence report
              </p>
              <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                {orgName}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Generated {formatDateTime(report.generatedAt)} · Synthesized from
                interviews, session recordings, and behavioral signals
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <StatPill label="Participants" value={report.participants.length} />
                <StatPill label="Interviews" value={report.interviews.length} />
                <StatPill label="Recordings" value={report.recordings.length} />
                <StatPill
                  label="Readiness"
                  value={`${report.overallScore}%`}
                  accent
                />
                <StatPill
                  label="Recoverable"
                  value={`${recoverableHours}h/wk`}
                  accent
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/builder"
                  className="workspace-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
                >
                  Build automations
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/interviews"
                  className="workspace-btn-ghost inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm"
                >
                  View interviews
                </Link>
              </div>
            </header>

            {/* Mobile TOC */}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Executive summary */}
            <ReportSection
              id="executive"
              title="Executive summary"
              description="High-level findings and recommended focus areas."
            >
              <ScoreHero
                score={report.overallScore}
                label="Automation readiness"
                summary={report.summary}
              >
                <ul className="mt-4 space-y-2">
                  {report.keyFindings.map((finding) => (
                    <li
                      key={finding}
                      className="flex gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                      {finding}
                    </li>
                  ))}
                </ul>
              </ScoreHero>
            </ReportSection>

            {/* Participants */}
            <ReportSection
              id="participants"
              title="Participants"
              description="People interviewed and recorded — roles, themes, and automation potential."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {report.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] text-sm font-medium text-[var(--brand)]">
                        {initials(participant.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {participant.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.role}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
                        {participant.automationPotential}%
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {participant.keyFinding}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {participant.topThemes.map((theme) => (
                        <span
                          key={theme}
                          className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="size-3" />
                        {participant.interviewCount} interviews
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="size-3" />
                        {participant.recordingCount} recordings
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <ChartCard
                  title="Automation potential by participant"
                  subtitle="Composite score from interview pain signals"
                >
                  <VizBarChart
                    data={report.participantScores.map((p) => ({
                      name: p.name.split(" ")[0] ?? p.name,
                      value: p.automationPotential,
                    }))}
                    layout="vertical"
                    height={Math.max(120, report.participantScores.length * 44)}
                    singleColor
                  />
                </ChartCard>
              </div>
            </ReportSection>

            {/* Interviews */}
            <ReportSection
              id="interviews"
              title="Interview findings"
              description={`${report.interviews.length} conversations analyzed for themes, pain points, and workflow opportunities.`}
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                {report.interviewStats.byStatus.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {item.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {report.interviews.map((interview) => (
                  <article
                    key={interview.id}
                    className="rounded-xl border border-border bg-card p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-foreground">
                            {interview.title}
                          </h3>
                          <StatusBadge status={interview.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {interview.participantName} · {interview.durationMin} min
                          · Top pain: {interview.topPain}
                        </p>
                      </div>
                      <span className="rounded-full bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[var(--brand)]">
                        {interview.automationScore}% fit
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {interview.summary}
                    </p>
                    {interview.themes.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {interview.themes.map((theme) => (
                          <span
                            key={theme}
                            className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href="/interviews"
                        className="text-xs text-[var(--brand)] hover:underline"
                      >
                        Open in interviews →
                      </Link>
                      {interview.recordingId ? (
                        <Link
                          href={`/recordings/${interview.recordingId}`}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          View linked recording →
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              {report.interviewStats.themes.length > 0 ? (
                <div className="mt-4">
                  <ChartCard title="Top themes across interviews" subtitle="Frequency by theme">
                    <VizBarChart
                      data={report.interviewStats.themes.map((t) => ({
                        name: t.name,
                        value: t.value,
                      }))}
                      layout="vertical"
                      height={Math.max(140, report.interviewStats.themes.length * 36)}
                      singleColor
                    />
                  </ChartCard>
                </div>
              ) : null}
            </ReportSection>

            {/* Recordings */}
            <ReportSection
              id="recordings"
              title="Session recordings"
              description="Behavioral signals from screen capture — context switching, event density, and app usage."
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-2xl font-semibold tabular-nums">
                    {report.recordingStats.totalEvents}
                  </p>
                  <p className="text-xs text-muted-foreground">Total captured events</p>
                </div>
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-2xl font-semibold tabular-nums">
                    {report.recordings.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Sessions analyzed</p>
                </div>
              </div>

              <div className="space-y-3">
                {report.recordings.map((recording) => (
                  <article
                    key={recording.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground">
                        {recording.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {recording.participantName} ·{" "}
                        {formatDurationLong(recording.durationSec)} ·{" "}
                        {recording.totalEvents} events
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {recording.summary}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                      <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
                        {recording.contextSwitchRate}% context switch
                      </span>
                      {recording.topApp ? (
                        <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                          Top app: {recording.topApp}
                        </span>
                      ) : null}
                      <Link
                        href={`/recordings/${recording.id}`}
                        className="text-xs text-[var(--brand)] hover:underline"
                      >
                        Open recording →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </ReportSection>

            {/* Org health */}
            <ReportSection
              id="health"
              title="Org health"
              description="Six-dimension maturity model and estimated time lost by category."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title="Maturity radar"
                  subtitle="Strengths vs. fragile areas"
                >
                  <VizRadarChart data={report.radar} height={280} />
                </ChartCard>
                <ChartCard
                  title="Time lost by category"
                  subtitle="Estimated hours per week"
                >
                  <VizBarChart
                    data={report.timeByCategory.map((c) => ({
                      name: c.category,
                      value: c.hours,
                    }))}
                    layout="vertical"
                    height={280}
                    singleColor
                  />
                </ChartCard>
              </div>
            </ReportSection>

            {/* Bottlenecks */}
            <ReportSection
              id="bottlenecks"
              title="Critical bottlenecks"
              description={`~${weeklyHoursLost} hours/week lost across ${report.bottlenecks.length} priority friction points.`}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {report.bottlenecks.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-foreground">
                        {item.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--destructive)]">
                        {item.severity}%
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      ~{item.hoursPerWeek}h/week · {item.category} ·{" "}
                      {item.affectedRoles.join(", ")}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--destructive)] opacity-80"
                        style={{ width: `${item.severity}%` }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </ReportSection>

            {/* Inefficiencies */}
            <ReportSection
              id="inefficiencies"
              title="Inefficiencies detected"
              description="Ranked friction patterns from interviews and session recordings."
            >
              <ChartCard title="Impact ranking" subtitle="Higher = more recoverable time">
                <VizBarChart
                  data={report.inefficiencies.map((i) => ({
                    name:
                      i.label.length > 32 ? `${i.label.slice(0, 30)}…` : i.label,
                    value: i.impact,
                  }))}
                  layout="vertical"
                  height={Math.max(180, report.inefficiencies.length * 40)}
                  singleColor
                />
              </ChartCard>

              <div className="mt-4 space-y-2">
                {report.inefficiencies.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.frequency.replace("-", " ")}
                      </p>
                    </div>
                    <SourceBadge source={item.source} />
                    <span className="text-sm font-semibold tabular-nums text-[var(--brand)]">
                      {item.impact}%
                    </span>
                  </div>
                ))}
              </div>
            </ReportSection>

            {/* Automation */}
            <ReportSection
              id="automation"
              title="Automation roadmap"
              description={`${report.automationIdeas.length} prioritized ideas · ~${recoverableHours} hours recoverable per week.`}
            >
              <ChartCard
                title="Impact vs effort vs ROI"
                subtitle="Compare opportunities side by side"
              >
                <ImpactEffortChart ideas={report.automationIdeas} />
              </ChartCard>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {report.automationIdeas.map((idea, index) => (
                  <article
                    key={idea.id}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-xs font-semibold text-[var(--brand)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground">{idea.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {idea.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ProgressBars
                        items={[
                          { label: "Impact", value: idea.impactScore },
                          { label: "ROI score", value: idea.roiScore },
                          {
                            label: "Ease (inverse effort)",
                            value: 100 - idea.effortScore,
                          },
                        ]}
                      />
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      Saves ~{idea.minutesSavedPerWeek} min/week
                    </p>
                    {idea.linkedInterviewIds[0] ? (
                      <div className="mt-3">
                        <GenerateWorkflowButton
                          interviewId={idea.linkedInterviewIds[0]}
                          label="Generate workflow"
                        />
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </ReportSection>

            {/* Maturity */}
            <ReportSection
              id="maturity"
              title="Maturity & next steps"
              description="Research program progress and recommended actions."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Program progress" subtitle="Current vs target">
                  <ProgressBars
                    items={report.maturityProgress.map((m) => ({
                      label: m.area,
                      value: m.current,
                      hint: `Target: ${m.target}%`,
                    }))}
                  />
                </ChartCard>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrendingUp className="size-4 text-[var(--brand)]" />
                    Recommended next steps
                  </h3>
                  <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      Address top bottleneck: {report.bottlenecks[0]?.title ?? "—"}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      Ship highest-ROI automation:{" "}
                      {report.automationIdeas[0]?.title ?? "—"}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      Complete scheduled interviews to close coverage gaps
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">4.</span>
                      Capture session recordings for roles without behavioral data
                    </li>
                  </ol>
                  <Link
                    href="/builder"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:underline"
                  >
                    Open workflow builder
                    <Zap className="size-3.5" />
                  </Link>
                </div>
              </div>
            </ReportSection>

            <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
              Report generated for {orgName} · {formatDateTime(report.generatedAt)}
            </footer>
          </div>
        </article>
      </div>
    </WorkspacePage>
  );
}
