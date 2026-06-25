"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  Command,
  Keyboard,
  MousePointer2,
  ScrollText,
} from "lucide-react";
import {
  ResearchDetailBar,
  ResearchDetailBody,
  ResearchSegment,
  ResearchShell,
  ResearchThread,
} from "@/app/components/chatzy";
import { MobileBackButton } from "@/app/components/chatzy/mobile-back-button";
import { RecordingVisualPanel } from "@/app/components/workspace/features/recording-visual-panel";
import { getRecordingVisualMetrics } from "@/lib/workspace/recording-analytics";
import { RecordingScreenshotMock } from "@/app/components/workspace/features/recording-screenshot-mock";
import { WorkspacePage } from "@/app/components/workspace/layout/workspace-page";
import { GenerateWorkflowButton } from "@/app/components/workspace/features/generate-workflow-button";
import { listRecordingEvents } from "@/lib/workspace/recording-events";
import type {
  Participant,
  RecordingEvent,
  RecordingEventType,
  RecordingScreenshotEvent,
  ScreenRecording,
} from "@/lib/workspace/types";
import {
  formatDateTime,
  formatDurationLong,
  formatTimelineOffset,
} from "@/lib/workspace/format";
import { cn } from "@/lib/utils";

type EventFilter = "all" | RecordingEventType;

const EVENT_META: Record<
  RecordingEventType,
  { label: string; icon: typeof Camera }
> = {
  screenshot: { label: "Screenshot", icon: Camera },
  click: { label: "Click", icon: MousePointer2 },
  app_switch: { label: "App switch", icon: ArrowLeftRight },
  keystroke: { label: "Keystroke", icon: Keyboard },
  shortcut: { label: "Shortcut", icon: Command },
  scroll: { label: "Scroll", icon: ScrollText },
};

function eventTitle(event: RecordingEvent): string {
  switch (event.type) {
    case "screenshot":
      return event.windowTitle;
    case "click":
      return `Clicked “${event.target}”`;
    case "app_switch":
      return `${event.fromApp} → ${event.toApp}`;
    case "keystroke":
      return `Typed in ${event.appName}`;
    case "shortcut":
      return `${event.keys}`;
    case "scroll":
      return `Scrolled in ${event.appName}`;
    default:
      return "Event";
  }
}

function EventPreview({ event }: { event: RecordingEvent }) {
  if (event.type === "screenshot") {
    return (
      <RecordingScreenshotMock
        scene={event.scene}
        appName={event.appName}
        windowTitle={event.windowTitle}
        highlight
      />
    );
  }

  const meta = EVENT_META[event.type];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-12 text-center">
      <div className="chatzy-bubble-avatar chatzy-bubble-avatar--brand mb-4 h-12 w-12">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {meta.label}
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
        {eventTitle(event)}
      </p>
      <p className="mt-3 font-mono text-xs text-[var(--text-tertiary)]">
        {formatTimelineOffset(event.offsetMs)}
      </p>
    </div>
  );
}

type RecordingDetailViewProps = {
  recording: ScreenRecording;
  participant: Participant | null;
};

export function RecordingDetailView({
  recording,
  participant,
}: RecordingDetailViewProps) {
  const events = useMemo(
    () => listRecordingEvents(recording.id),
    [recording.id]
  );

  const [selectedId, setSelectedId] = useState(events[0]?.id ?? null);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [detailTab, setDetailTab] = useState<"timeline" | "analytics">("timeline");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const visualMetrics = useMemo(
    () => getRecordingVisualMetrics(recording),
    [recording]
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? events
        : events.filter((event) => event.type === filter),
    [events, filter]
  );

  const selected =
    filtered.find((event) => event.id === selectedId) ??
    filtered[0] ??
    null;

  const eventCounts = useMemo(() => {
    const counts: Partial<Record<RecordingEventType, number>> = {};
    for (const event of events) {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const nearestScreenshot = useMemo((): RecordingScreenshotEvent | null => {
    if (!selected || selected.type === "screenshot") return null;
    const idx = events.findIndex((e) => e.id === selected.id);
    for (let i = idx; i >= 0; i--) {
      const event = events[i];
      if (event?.type === "screenshot") return event;
    }
    const first = events.find((e) => e.type === "screenshot");
    return first?.type === "screenshot" ? first : null;
  }, [events, selected]);

  const filterChips: Array<{ value: EventFilter; label: string }> = [
    { value: "all", label: `All (${events.length})` },
    ...(Object.keys(EVENT_META) as RecordingEventType[])
      .filter((type) => (eventCounts[type] ?? 0) > 0)
      .map((type) => ({
        value: type,
        label: `${EVENT_META[type].label} (${eventCounts[type]})`,
      })),
  ];

  return (
    <WorkspacePage className="overflow-hidden p-0 sm:p-0">
      <ResearchShell
        className={!mobileDetailOpen ? "research-shell--list-first" : undefined}
        detailOpen={mobileDetailOpen}
        title="Timeline"
        meta={`${events.length} events · ${formatDurationLong(recording.durationSec)}`}
        filters={
          <>
            {filterChips.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "chatzy-chip",
                  filter === value && "chatzy-chip--active"
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
              No events
            </p>
          ) : (
            filtered.map((event) => (
              <ResearchThread
                key={event.id}
                active={event.id === selected?.id}
                onClick={() => {
                  setSelectedId(event.id);
                  setMobileDetailOpen(true);
                }}
                title={eventTitle(event)}
                meta={`${formatTimelineOffset(event.offsetMs)} · ${EVENT_META[event.type].label}`}
              />
            ))
          )
        }
      >
        <>
          <ResearchDetailBar
            title={recording.title}
            subtitle={`${participant?.name ?? "Unknown"} · ${formatDateTime(recording.capturedAt)}`}
            leading={
              <MobileBackButton
                onClick={() => setMobileDetailOpen(false)}
                label="Timeline"
              />
            }
            trailing={
              <div className="flex flex-wrap items-center gap-2">
                <ResearchSegment
                  tabs={[
                    { id: "timeline", label: "Timeline" },
                    { id: "analytics", label: "Analytics" },
                  ]}
                  active={detailTab}
                  onChange={(id) => setDetailTab(id as "timeline" | "analytics")}
                />
                <Link
                  href="/recordings"
                  className="workspace-btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </Link>
                <GenerateWorkflowButton
                  recordingId={recording.id}
                  label="Build workflow"
                  className="workspace-btn-primary rounded-full px-4 py-2 text-sm font-medium"
                />
              </div>
            }
          />

          <ResearchDetailBody>
            {detailTab === "analytics" ? (
              <RecordingVisualPanel metrics={visualMetrics} />
            ) : selected ? (
              <div className="space-y-6">
                <p className="text-[0.9375rem] leading-relaxed text-[var(--text-secondary)]">
                  {recording.summary}
                </p>
                <EventPreview event={selected} />
                {selected.type !== "screenshot" && nearestScreenshot ? (
                  <div>
                    <p className="mb-3 text-sm font-medium text-[var(--text-tertiary)]">
                      Screen at this moment
                    </p>
                    <RecordingScreenshotMock
                      scene={nearestScreenshot.scene}
                      appName={nearestScreenshot.appName}
                      windowTitle={nearestScreenshot.windowTitle}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                Select an event from the timeline.
              </p>
            )}
          </ResearchDetailBody>
        </>
      </ResearchShell>
    </WorkspacePage>
  );
}
