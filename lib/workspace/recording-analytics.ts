import { listRecordingEvents, recordingEvents } from "@/lib/workspace/recording-events";
import type { RecordingEvent, ScreenRecording } from "@/lib/workspace/types";

export type RecordingVisualMetrics = {
  totalEvents: number;
  durationSec: number;
  eventsPerMinute: number;
  eventTypeBreakdown: Array<{ type: string; label: string; count: number }>;
  appUsage: Array<{ app: string; count: number }>;
  activityTimeline: Array<{ bucket: string; events: number }>;
  contextSwitchRate: number;
  manualActionScore: number;
};

const EVENT_LABELS: Record<string, string> = {
  screenshot: "Screenshots",
  click: "Clicks",
  app_switch: "App switches",
  keystroke: "Keystrokes",
  shortcut: "Shortcuts",
  scroll: "Scrolls",
};

function getEventsForRecording(recordingId: string): RecordingEvent[] {
  return recordingEvents.filter((e) => e.recordingId === recordingId);
}

export function getRecordingVisualMetrics(
  recording: ScreenRecording
): RecordingVisualMetrics {
  const events = listRecordingEvents(recording.id);
  const durationSec = Math.max(recording.durationSec, 1);
  const eventsPerMinute = Math.round((events.length / durationSec) * 60 * 10) / 10;

  const typeCounts = new Map<string, number>();
  const appCounts = new Map<string, number>();

  for (const event of events) {
    typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
    if (event.type === "app_switch") {
      appCounts.set(event.toApp, (appCounts.get(event.toApp) ?? 0) + 1);
    } else if ("appName" in event && event.appName) {
      appCounts.set(event.appName, (appCounts.get(event.appName) ?? 0) + 1);
    }
  }

  const bucketCount = 8;
  const bucketSizeMs = (durationSec * 1000) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    bucket: `${Math.round((i / bucketCount) * durationSec)}s`,
    events: 0,
  }));

  for (const event of events) {
    const idx = Math.min(
      bucketCount - 1,
      Math.floor(event.offsetMs / Math.max(bucketSizeMs, 1))
    );
    buckets[idx].events += 1;
  }

  const appSwitches = typeCounts.get("app_switch") ?? 0;
  const contextSwitchRate = Math.min(
    100,
    Math.round((appSwitches / Math.max(events.length, 1)) * 100 * 2.5)
  );

  const clicks = typeCounts.get("click") ?? 0;
  const keystrokes = typeCounts.get("keystroke") ?? 0;
  const manualActionScore = Math.min(
    100,
    Math.round(((clicks + keystrokes) / Math.max(events.length, 1)) * 100)
  );

  return {
    totalEvents: events.length,
    durationSec,
    eventsPerMinute,
    eventTypeBreakdown: [...typeCounts.entries()].map(([type, count]) => ({
      type,
      label: EVENT_LABELS[type] ?? type,
      count,
    })),
    appUsage: [...appCounts.entries()]
      .map(([app, count]) => ({ app, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    activityTimeline: buckets,
    contextSwitchRate,
    manualActionScore,
  };
}

export function getOrgRecordingStats(recordings: ScreenRecording[]) {
  let totalEvents = 0;
  const typeTotals = new Map<string, number>();

  for (const recording of recordings) {
    const events = getEventsForRecording(recording.id);
    totalEvents += events.length;
    for (const event of events) {
      typeTotals.set(event.type, (typeTotals.get(event.type) ?? 0) + 1);
    }
  }

  return {
    totalEvents,
    byType: [...typeTotals.entries()].map(([type, value]) => ({
      name: EVENT_LABELS[type] ?? type,
      value,
    })),
  };
}
