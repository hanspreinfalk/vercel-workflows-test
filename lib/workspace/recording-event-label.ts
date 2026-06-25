import type { RecordingEvent } from "@/lib/workspace/types";

export function formatRecordingEventLabel(event: RecordingEvent): string {
  switch (event.type) {
    case "screenshot":
      return event.windowTitle;
    case "click":
      return `Click · ${event.target}`;
    case "app_switch":
      return `${event.fromApp} → ${event.toApp}`;
    case "keystroke":
      return `Typed in ${event.appName}`;
    case "shortcut":
      return event.keys;
    case "scroll":
      return `Scroll · ${event.appName}`;
    default:
      return "Event";
  }
}
