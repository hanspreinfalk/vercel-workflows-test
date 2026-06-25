"use client";

import type { InterviewVisualMetrics } from "@/lib/workspace/interview-analytics";
import {
  ChartCard,
  MetricRing,
  ProgressBars,
  VizBarChart,
  VizRadarChart,
} from "@/app/components/chatzy/charts";

export function InterviewVisualPanel({ metrics }: { metrics: InterviewVisualMetrics }) {
  const radarData = [
    { dimension: "Manual work", score: metrics.painRadar.manualWork, fullMark: 100 },
    { dimension: "Handoffs", score: metrics.painRadar.handoffs, fullMark: 100 },
    { dimension: "Data entry", score: metrics.painRadar.dataEntry, fullMark: 100 },
    { dimension: "Waiting", score: metrics.painRadar.waiting, fullMark: 100 },
    { dimension: "Duplication", score: metrics.painRadar.duplication, fullMark: 100 },
    { dimension: "Auto fit", score: metrics.painRadar.automationFit, fullMark: 100 },
  ];

  const themeData = metrics.themeCounts.map((t) => ({
    name: t.theme,
    value: t.count,
  }));

  return (
    <div className="viz-grid">
      <div className="viz-grid__metrics">
        <MetricRing value={metrics.automationScore} label="Automation fit" />
        <MetricRing
          value={Math.min(99, metrics.estimatedMinutesSaved)}
          label="Min saved / run"
          suffix=""
        />
        <MetricRing
          value={Math.min(100, metrics.handoffCount * 22)}
          label="Handoff risk"
        />
      </div>

      <ChartCard title="Pain signal radar" subtitle="Where friction clusters in this interview">
        <VizRadarChart data={radarData} height={260} />
      </ChartCard>

      {themeData.length > 0 ? (
        <ChartCard title="Themes identified" subtitle="Topics surfaced in conversation">
          <VizBarChart data={themeData} layout="horizontal" height={Math.max(120, themeData.length * 36)} />
        </ChartCard>
      ) : null}

      <ChartCard title="Workflow readiness" subtitle="How prepared this process is to automate">
        <ProgressBars items={metrics.workflowReadiness.map((r) => ({ label: r.label, value: r.value }))} />
      </ChartCard>
    </div>
  );
}
