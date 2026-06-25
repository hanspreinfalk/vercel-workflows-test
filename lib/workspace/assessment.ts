import {
  getInterviewVisualMetrics,
  getOrgInterviewStats,
} from "@/lib/workspace/interview-analytics";
import {
  getOrgRecordingStats,
  getRecordingVisualMetrics,
} from "@/lib/workspace/recording-analytics";
import {
  listInterviews,
  listParticipants,
  listRecordings,
} from "@/lib/workspace/org-store";
import type { Interview, Participant } from "@/lib/workspace/types";

export type Bottleneck = {
  id: string;
  title: string;
  category: string;
  severity: number;
  hoursPerWeek: number;
  affectedRoles: string[];
  description: string;
};

export type Inefficiency = {
  id: string;
  label: string;
  impact: number;
  frequency: "daily" | "weekly" | "per-task";
  source: "interview" | "recording" | "both";
};

export type AutomationIdea = {
  id: string;
  title: string;
  description: string;
  impactScore: number;
  effortScore: number;
  roiScore: number;
  minutesSavedPerWeek: number;
  linkedInterviewIds: string[];
};

export type ParticipantReport = {
  id: string;
  name: string;
  role: string;
  email: string;
  interviewCount: number;
  recordingCount: number;
  automationPotential: number;
  topThemes: string[];
  keyFinding: string;
};

export type InterviewReport = {
  id: string;
  title: string;
  participantName: string;
  status: Interview["status"];
  summary: string;
  themes: string[];
  durationMin: number;
  automationScore: number;
  topPain: string;
  recordingId?: string;
};

export type RecordingReport = {
  id: string;
  title: string;
  participantName: string;
  summary: string;
  durationSec: number;
  contextSwitchRate: number;
  totalEvents: number;
  eventsPerMinute: number;
  topApp: string | null;
};

export type OrgAssessment = {
  orgId: string;
  orgName: string;
  generatedAt: number;
  overallScore: number;
  summary: string;
  keyFindings: string[];
  totalRecoverableMinutes: number;
  participants: ParticipantReport[];
  interviews: InterviewReport[];
  recordings: RecordingReport[];
  radar: Array<{ dimension: string; score: number; fullMark: number }>;
  bottlenecks: Bottleneck[];
  inefficiencies: Inefficiency[];
  automationIdeas: AutomationIdea[];
  timeByCategory: Array<{ category: string; hours: number }>;
  maturityProgress: Array<{ area: string; current: number; target: number }>;
  participantScores: Array<{ name: string; automationPotential: number }>;
  interviewStats: ReturnType<typeof getOrgInterviewStats>;
  recordingStats: ReturnType<typeof getOrgRecordingStats>;
};

function participantName(participants: Participant[], id: string): string {
  return participants.find((p) => p.id === id)?.name ?? "Unknown";
}

function topPainFromInterview(interview: Interview): string {
  const metrics = getInterviewVisualMetrics(interview);
  const pains = [
    { label: "Manual work", score: metrics.painRadar.manualWork },
    { label: "Handoffs", score: metrics.painRadar.handoffs },
    { label: "Data entry", score: metrics.painRadar.dataEntry },
    { label: "Waiting", score: metrics.painRadar.waiting },
    { label: "Duplication", score: metrics.painRadar.duplication },
  ];
  return pains.sort((a, b) => b.score - a.score)[0]?.label ?? "Process friction";
}

function buildParticipantReports(
  orgId: string,
  participants: Participant[],
  interviews: Interview[]
): ParticipantReport[] {
  return participants
    .filter((p) => p.orgId === orgId)
    .map((participant) => {
      const pInterviews = interviews.filter((i) => i.participantId === participant.id);
      const themes = new Map<string, number>();
      for (const interview of pInterviews) {
        for (const theme of interview.themes ?? []) {
          themes.set(theme, (themes.get(theme) ?? 0) + 1);
        }
      }

      const automationPotential =
        pInterviews.length === 0
          ? 40
          : Math.round(
              pInterviews.reduce(
                (sum, i) => sum + getInterviewVisualMetrics(i).automationScore,
                0
              ) / pInterviews.length
            );

      const completed = pInterviews.find(
        (i) => i.status === "completed" || i.status === "analyzing"
      );

      return {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        email: participant.email,
        interviewCount: participant.interviewCount,
        recordingCount: participant.recordingCount,
        automationPotential,
        topThemes: [...themes.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([theme]) => theme),
        keyFinding:
          completed?.summary ??
          "Scheduled for discovery — baseline automation potential estimated from org patterns.",
      };
    });
}

function buildInterviewReports(
  interviews: Interview[],
  participants: Participant[]
): InterviewReport[] {
  return [...interviews]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((interview) => ({
      id: interview.id,
      title: interview.title,
      participantName: participantName(participants, interview.participantId),
      status: interview.status,
      summary: interview.summary,
      themes: interview.themes ?? [],
      durationMin: interview.durationMin,
      automationScore: getInterviewVisualMetrics(interview).automationScore,
      topPain: topPainFromInterview(interview),
      recordingId: interview.recordingId,
    }));
}

function buildRecordingReports(
  recordings: ReturnType<typeof listRecordings>,
  participants: Participant[]
): RecordingReport[] {
  return [...recordings]
    .sort((a, b) => b.capturedAt - a.capturedAt)
    .map((recording) => {
      const metrics = getRecordingVisualMetrics(recording);
      return {
        id: recording.id,
        title: recording.title,
        participantName: participantName(participants, recording.participantId),
        summary: recording.summary,
        durationSec: recording.durationSec,
        contextSwitchRate: metrics.contextSwitchRate,
        totalEvents: metrics.totalEvents,
        eventsPerMinute: metrics.eventsPerMinute,
        topApp: metrics.appUsage[0]?.app ?? null,
      };
    });
}

function buildBottlenecks(
  interviews: Interview[],
  participants: Participant[]
): Bottleneck[] {
  const items: Bottleneck[] = [];

  for (const interview of interviews) {
    if (interview.status !== "completed" && interview.status !== "analyzing") {
      continue;
    }
    const metrics = getInterviewVisualMetrics(interview);
    const name = participantName(participants, interview.participantId);

    if (metrics.painRadar.handoffs > 55) {
      items.push({
        id: `bn-${interview.id}-handoff`,
        title: `Handoff gap — ${interview.title}`,
        category: "Handoffs",
        severity: metrics.painRadar.handoffs,
        hoursPerWeek: Math.round(metrics.painRadar.handoffs / 8),
        affectedRoles: [name],
        description:
          "Ownership transitions between teams create idle time and duplicate status updates.",
      });
    }

    if (metrics.painRadar.dataEntry > 50) {
      items.push({
        id: `bn-${interview.id}-data`,
        title: `Data re-entry — ${interview.title}`,
        category: "Data entry",
        severity: metrics.painRadar.dataEntry,
        hoursPerWeek: Math.round(metrics.painRadar.dataEntry / 6),
        affectedRoles: [name],
        description:
          "Same client or ticket data copied across multiple tools without sync.",
      });
    }
  }

  if (items.length === 0) {
    items.push({
      id: "bn-default",
      title: "Cross-tool context switching",
      category: "Context switching",
      severity: 68,
      hoursPerWeek: 6,
      affectedRoles: participants.map((p) => p.name).slice(0, 2),
      description:
        "Session recordings show frequent app switches during routine tasks.",
    });
  }

  return items.sort((a, b) => b.severity - a.severity).slice(0, 6);
}

function buildAutomationIdeas(interviews: Interview[]): AutomationIdea[] {
  const ideas: AutomationIdea[] = [
    {
      id: "auto-crm-sync",
      title: "CRM → intake auto-sync",
      description:
        "When a deal closes, push client fields to intake sheet and billing tracker automatically.",
      impactScore: 92,
      effortScore: 45,
      roiScore: 94,
      minutesSavedPerWeek: 180,
      linkedInterviewIds: interviews
        .filter((i) => (i.themes ?? []).includes("CRM"))
        .map((i) => i.id),
    },
    {
      id: "auto-support-context",
      title: "Support ticket context panel",
      description:
        "Aggregate billing + usage into Zendesk sidebar so agents stop tab-switching.",
      impactScore: 88,
      effortScore: 52,
      roiScore: 86,
      minutesSavedPerWeek: 240,
      linkedInterviewIds: interviews
        .filter((i) => (i.themes ?? []).includes("Support"))
        .map((i) => i.id),
    },
    {
      id: "auto-deploy-gates",
      title: "CI deploy gate dashboard",
      description:
        "Replace Slack emoji confirmations with automated green/red gates tied to pipeline checks.",
      impactScore: 85,
      effortScore: 58,
      roiScore: 82,
      minutesSavedPerWeek: 90,
      linkedInterviewIds: interviews
        .filter((i) => (i.themes ?? []).includes("Deploy"))
        .map((i) => i.id),
    },
    {
      id: "auto-legal-queue",
      title: "Legal review queue",
      description:
        "Route contracts to a tracked queue with SLA reminders instead of email threads.",
      impactScore: 78,
      effortScore: 40,
      roiScore: 80,
      minutesSavedPerWeek: 120,
      linkedInterviewIds: interviews
        .filter((i) => (i.themes ?? []).includes("Onboarding"))
        .map((i) => i.id),
    },
  ];

  return ideas.sort((a, b) => b.roiScore - a.roiScore);
}

export function buildOrgAssessment(orgId: string, orgName = "Organization"): OrgAssessment {
  const interviews = listInterviews(orgId);
  const recordings = listRecordings(orgId);
  const participants = listParticipants(orgId);
  const interviewStats = getOrgInterviewStats(interviews);
  const recordingStats = getOrgRecordingStats(recordings);

  const participantReports = buildParticipantReports(orgId, participants, interviews);
  const interviewReports = buildInterviewReports(interviews, participants);
  const recordingReports = buildRecordingReports(recordings, participants);

  const avgAutomation =
    interviews.length === 0
      ? 50
      : Math.round(
          interviews.reduce(
            (sum, i) => sum + getInterviewVisualMetrics(i).automationScore,
            0
          ) / interviews.length
        );

  let avgContextSwitch = 50;
  if (recordings.length > 0) {
    avgContextSwitch = Math.round(
      recordings.reduce(
        (sum, r) => sum + getRecordingVisualMetrics(r).contextSwitchRate,
        0
      ) / recordings.length
    );
  }

  const bottlenecks = buildBottlenecks(interviews, participants);
  const automationIdeas = buildAutomationIdeas(interviews);
  const totalRecoverableMinutes = automationIdeas.reduce(
    (sum, idea) => sum + idea.minutesSavedPerWeek,
    0
  );

  const inefficiencies = ([
    {
      id: "ineff-1",
      label: "Manual CRM export → spreadsheet paste",
      impact: 88,
      frequency: "weekly" as const,
      source: "both" as const,
    },
    {
      id: "ineff-2",
      label: "Duplicate client ID entry (4+ tools)",
      impact: 82,
      frequency: "per-task" as const,
      source: "interview" as const,
    },
    {
      id: "ineff-3",
      label: "Billing + usage lookup per ticket",
      impact: 76,
      frequency: "daily" as const,
      source: "both" as const,
    },
    {
      id: "ineff-4",
      label: "Slack confirmation for deploy steps",
      impact: 71,
      frequency: "weekly" as const,
      source: "interview" as const,
    },
    {
      id: "ineff-5",
      label: "High app-switch density in sessions",
      impact: avgContextSwitch,
      frequency: "daily" as const,
      source: "recording" as const,
    },
  ] satisfies Inefficiency[]).sort((a, b) => b.impact - a.impact);

  const radar = [
    { dimension: "Process clarity", score: 72, fullMark: 100 },
    { dimension: "Automation readiness", score: avgAutomation, fullMark: 100 },
    {
      dimension: "Tool integration",
      score: 100 - Math.min(avgContextSwitch, 85),
      fullMark: 100,
    },
    { dimension: "Data quality", score: 68, fullMark: 100 },
    { dimension: "Handoff efficiency", score: 58, fullMark: 100 },
    {
      dimension: "Observability",
      score: recordingStats.totalEvents > 20 ? 74 : 45,
      fullMark: 100,
    },
  ];

  const timeByCategory = [
    { category: "Data entry", hours: 8.5 },
    { category: "Handoffs", hours: 6.2 },
    { category: "Context switching", hours: 5.8 },
    { category: "Reporting", hours: 4.1 },
    { category: "Approvals", hours: 3.4 },
  ];

  const maturityProgress = [
    {
      area: "Interview coverage",
      current: Math.min(100, interviews.length * 25),
      target: 100,
    },
    {
      area: "Session capture",
      current: Math.min(100, recordings.length * 12),
      target: 100,
    },
    {
      area: "Workflow drafts",
      current:
        interviews.filter((i) => i.workflowId).length * 30 + 20,
      target: 100,
    },
    { area: "Automation deployed", current: 15, target: 100 },
  ];

  const participantScores = participantReports.map((p) => ({
    name: p.name,
    automationPotential: p.automationPotential,
  }));

  const themeCount = interviewStats.themes.length;
  const overallScore = Math.round(
    (avgAutomation * 0.35 +
      (100 - avgContextSwitch) * 0.25 +
      Math.min(themeCount * 15, 100) * 0.2 +
      automationIdeas.length * 5) /
      1.2
  );

  const keyFindings = [
    `${participants.length} participants contributed ${interviews.length} interviews and ${recordings.length} session recordings.`,
    `${bottlenecks.length} critical bottlenecks account for ~${bottlenecks.reduce((s, b) => s + b.hoursPerWeek, 0)} hours lost per week.`,
    `${automationIdeas.length} automation opportunities could recover ~${Math.round(totalRecoverableMinutes / 60)} hours weekly.`,
    `Average context-switch rate across recordings: ${avgContextSwitch}% — above healthy threshold.`,
    `Strongest automation readiness signal: ${radar.sort((a, b) => b.score - a.score)[0]?.dimension ?? "Process clarity"}.`,
  ];

  return {
    orgId,
    orgName,
    generatedAt: Date.now(),
    overallScore: Math.min(96, overallScore),
    summary: `This report synthesizes qualitative interviews, behavioral session recordings, and AI analysis across ${participants.length} participants. The org scores ${Math.min(96, overallScore)}/100 on automation readiness, with ${bottlenecks.length} bottlenecks and ${automationIdeas.length} high-ROI workflow opportunities identified.`,
    keyFindings,
    totalRecoverableMinutes,
    participants: participantReports,
    interviews: interviewReports,
    recordings: recordingReports,
    radar,
    bottlenecks,
    inefficiencies,
    automationIdeas,
    timeByCategory,
    maturityProgress,
    participantScores,
    interviewStats,
    recordingStats,
  };
}
