export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type Participant = {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
  interviewCount: number;
  recordingCount: number;
  lastActiveAt: number;
};

export type Interview = {
  id: string;
  orgId: string;
  participantId: string;
  title: string;
  status: "scheduled" | "completed" | "analyzing";
  summary: string;
  transcriptPreview: string;
  analysisPreview: string;
  themes: string[];
  durationMin: number;
  createdAt: number;
  /** Linked session recording for this interview. */
  recordingId?: string;
  /** Generated workflow after research pipeline. */
  workflowId?: string;
};

export type ScreenRecording = {
  id: string;
  orgId: string;
  participantId: string;
  title: string;
  summary: string;
  durationSec: number;
  capturedAt: number;
};

export type RecordingScreenshotScene =
  | "crm-list"
  | "crm-export-dialog"
  | "spreadsheet-raw"
  | "spreadsheet-clean"
  | "stripe-dashboard"
  | "zendesk-ticket"
  | "terminal"
  | "browser-tabs";

type RecordingEventBase = {
  id: string;
  recordingId: string;
  offsetMs: number;
};

export type RecordingScreenshotEvent = RecordingEventBase & {
  type: "screenshot";
  appName: string;
  windowTitle: string;
  scene: RecordingScreenshotScene;
  caption?: string;
};

export type RecordingClickEvent = RecordingEventBase & {
  type: "click";
  appName: string;
  target: string;
};

export type RecordingAppSwitchEvent = RecordingEventBase & {
  type: "app_switch";
  fromApp: string;
  toApp: string;
};

export type RecordingKeystrokeEvent = RecordingEventBase & {
  type: "keystroke";
  appName: string;
  text: string;
};

export type RecordingShortcutEvent = RecordingEventBase & {
  type: "shortcut";
  appName: string;
  keys: string;
  action: string;
};

export type RecordingScrollEvent = RecordingEventBase & {
  type: "scroll";
  appName: string;
  direction: "up" | "down";
};

export type RecordingEvent =
  | RecordingScreenshotEvent
  | RecordingClickEvent
  | RecordingAppSwitchEvent
  | RecordingKeystrokeEvent
  | RecordingShortcutEvent
  | RecordingScrollEvent;

export type RecordingEventType = RecordingEvent["type"];
