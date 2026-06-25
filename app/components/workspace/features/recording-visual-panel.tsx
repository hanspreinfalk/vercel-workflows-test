"use client";

import type { RecordingVisualMetrics } from "@/lib/workspace/recording-analytics";
import {
  ChartCard,
  MetricRing,
  ProgressBars,
  VizActivityChart,
  VizBarChart,
  VizStackedLegend,
} from "@/app/components/chatzy/charts";

export function RecordingVisualPanel({
  metrics,
}: {
  metrics: RecordingVisualMetrics;
}) {
  const typeData = metrics.eventTypeBreakdown.map((e) => ({
    name: e.label,
    value: e.count,
  }));

  const appData = metrics.appUsage.map((a) => ({
    name: a.app.length > 14 ? `${a.app.slice(0, 12)}…` : a.app,
    value: a.count,
  }));

  return (
    <div className="viz-grid">
      <div className="viz-grid__metrics">
        <MetricRing
          value={Math.min(100, Math.round(metrics.eventsPerMinute * 8))}
          label="Activity density"
        />
        <MetricRing value={metrics.contextSwitchRate} label="Context switches" />
        <MetricRing value={metrics.manualActionScore} label="Manual actions" />
      </div>

      <ChartCard
        title="Session activity"
        subtitle={`${metrics.totalEvents} events over ${Math.round(metrics.durationSec / 60)} min`}
      >
        <VizActivityChart data={metrics.activityTimeline} height={140} />
      </ChartCard>

      <ChartCard title="Event breakdown" subtitle="What happened during the capture">
        <VizBarChart data={typeData} layout="horizontal" height={Math.max(140, typeData.length * 32)} />
        <VizStackedLegend
          items={metrics.eventTypeBreakdown.map((e) => ({
            label: e.label,
            value: e.count,
          }))}
        />
      </ChartCard>

      {appData.length > 0 ? (
        <ChartCard title="App focus" subtitle="Where time was spent">
          <VizBarChart data={appData} layout="horizontal" height={Math.max(120, appData.length * 34)} />
        </ChartCard>
      ) : null}

      <ChartCard title="Automation signals" subtitle="Derived from session patterns">
        <ProgressBars
          items={[
            {
              label: "Repeatable clicks",
              value: metrics.manualActionScore,
            },
            {
              label: "Tool fragmentation",
              value: metrics.contextSwitchRate,
            },
            {
              label: "Capture completeness",
              value: Math.min(100, metrics.totalEvents * 3),
            },
          ]}
        />
      </ChartCard>
    </div>
  );
}
