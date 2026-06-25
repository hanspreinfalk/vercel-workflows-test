import type { Interview } from "@/lib/workspace/types";

export type InterviewRadarScores = {
  manualWork: number;
  handoffs: number;
  dataEntry: number;
  waiting: number;
  duplication: number;
  automationFit: number;
};

export type InterviewVisualMetrics = {
  automationScore: number;
  estimatedMinutesSaved: number;
  handoffCount: number;
  themeCounts: Array<{ theme: string; count: number }>;
  painRadar: InterviewRadarScores;
  workflowReadiness: Array<{ label: string; value: number }>;
};

const PAIN_KEYWORDS: Record<keyof Omit<InterviewRadarScores, "automationFit">, string[]> = {
  manualWork: ["manual", "by hand", "copy", "paste", "spreadsheet", "checklist"],
  handoffs: ["handoff", "hand off", "transition", "email", "wait", "owner"],
  dataEntry: ["re-enter", "paste", "spreadsheet", "tracker", "crm", "export", "import"],
  waiting: ["wait", "sit", "offline", "delay", "day or two", "ping"],
  duplication: ["four", "three", "two tools", "again", "same", "re-enter", "multiple"],
};

function scoreFromText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  const hits = keywords.filter((k) => lower.includes(k)).length;
  return Math.min(100, 35 + hits * 12);
}

export function getInterviewVisualMetrics(interview: Interview): InterviewVisualMetrics {
  const themes = interview.themes ?? [];
  const corpus = `${interview.summary} ${interview.transcriptPreview} ${interview.analysisPreview}`;
  const lower = corpus.toLowerCase();

  const handoffCount =
    (lower.match(/handoff|hand off|handoffs/g)?.length ?? 0) +
    (lower.match(/\d+\s+different tools/g)?.length ?? 0) * 2 +
    (lower.includes("four") && lower.includes("tools") ? 2 : 0);

  const painRadar: InterviewRadarScores = {
    manualWork: scoreFromText(corpus, PAIN_KEYWORDS.manualWork),
    handoffs: scoreFromText(corpus, PAIN_KEYWORDS.handoffs),
    dataEntry: scoreFromText(corpus, PAIN_KEYWORDS.dataEntry),
    waiting: scoreFromText(corpus, PAIN_KEYWORDS.waiting),
    duplication: scoreFromText(corpus, PAIN_KEYWORDS.duplication),
    automationFit: 0,
  };

  painRadar.automationFit = Math.round(
    (painRadar.manualWork +
      painRadar.dataEntry +
      painRadar.duplication +
      painRadar.handoffs) /
      4
  );

  const savedMatch = interview.analysisPreview.match(/(\d+)\s*minutes?\s*saved/i);
  const estimatedMinutesSaved = savedMatch
    ? Number(savedMatch[1])
    : Math.round(painRadar.automationFit * 0.45);

  const automationScore =
    interview.status === "scheduled"
      ? 20
      : interview.status === "analyzing"
        ? 55
        : Math.min(98, painRadar.automationFit + (themes.includes("Automation") ? 8 : 0));

  const workflowReadiness = [
    { label: "Process clarity", value: interview.status === "completed" ? 88 : 45 },
    { label: "Data access", value: painRadar.dataEntry > 60 ? 72 : 85 },
    { label: "Automation fit", value: automationScore },
    { label: "Stakeholder buy-in", value: interview.status === "completed" ? 76 : 40 },
  ];

  return {
    automationScore,
    estimatedMinutesSaved,
    handoffCount: Math.max(handoffCount, themes.includes("Handoffs") ? 3 : 1),
    themeCounts: themes.map((theme) => ({ theme, count: 1 })),
    painRadar,
    workflowReadiness,
  };
}

export function getOrgInterviewStats(interviews: Interview[]) {
  const byStatus = {
    completed: interviews.filter((i) => i.status === "completed").length,
    analyzing: interviews.filter((i) => i.status === "analyzing").length,
    scheduled: interviews.filter((i) => i.status === "scheduled").length,
  };

  const themeMap = new Map<string, number>();
  for (const interview of interviews) {
    const themes = interview.themes ?? [];
    for (const theme of themes) {
      themeMap.set(theme, (themeMap.get(theme) ?? 0) + 1);
    }
  }

  return {
    byStatus: [
      { name: "Completed", value: byStatus.completed, fill: "var(--brand)" },
      { name: "Analyzing", value: byStatus.analyzing, fill: "var(--text-secondary)" },
      { name: "Scheduled", value: byStatus.scheduled, fill: "var(--text-tertiary)" },
    ],
    themes: [...themeMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  };
}
