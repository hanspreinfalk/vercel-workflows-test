export type AgentStreamEvent =
  | { kind: "init"; model?: string; tools?: string[] }
  | { kind: "thinking"; text: string }
  | { kind: "thinking_delta"; text: string }
  | { kind: "text_delta"; text: string }
  | { kind: "tool_start"; tool: string; toolUseId?: string }
  | { kind: "tool_input"; tool: string; input: unknown }
  | { kind: "tool_result"; tool: string; output: string }
  | { kind: "system"; subtype: string; message: string }
  | { kind: "result"; text: string };

export type AgentActivityItem = {
  id: string;
  kind: "thinking" | "tool" | "text" | "system";
  label: string;
  detail?: string;
  status: "running" | "done";
};

type StreamParserOptions = {
  onEvent: (event: AgentStreamEvent) => void;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export class ClaudeStreamParser {
  private finalText = "";
  private thinkingText = "";
  private activeTools = new Map<string, string>();

  constructor(private readonly options: StreamParserOptions) {}

  getFinalText() {
    return this.finalText.trim();
  }

  getThinkingText() {
    return this.thinkingText.trim();
  }

  handleLine(line: string) {
    let payload: unknown;
    try {
      payload = JSON.parse(line);
    } catch {
      return;
    }

    const record = asRecord(payload);
    if (!record) return;

    const type = asString(record.type);
    if (!type) return;

    if (type === "system") {
      const subtype = asString(record.subtype) ?? "system";
      const message =
        asString(record.message) ??
        asString(record.error) ??
        `System event: ${subtype}`;
      this.emit({ kind: "system", subtype, message });
      return;
    }

    if (type === "result") {
      const result = asString(record.result);
      if (result) {
        this.finalText = result;
        this.emit({ kind: "result", text: result });
      }
      return;
    }

    if (type === "stream_event") {
      this.handleStreamEvent(record);
      return;
    }

    if (type === "assistant") {
      this.handleAssistantMessage(record);
      return;
    }

    if (type === "user") {
      this.handleUserMessage(record);
    }
  }

  private handleStreamEvent(record: Record<string, unknown>) {
    const event = asRecord(record.event);
    if (!event) return;

    const delta = asRecord(event.delta);
    if (!delta) return;

    const deltaType = asString(delta.type);

    if (deltaType === "text_delta") {
      const text = asString(delta.text) ?? "";
      if (text) {
        this.finalText += text;
        this.emit({ kind: "text_delta", text });
      }
      return;
    }

    if (deltaType === "thinking_delta") {
      const text = asString(delta.thinking) ?? asString(delta.text) ?? "";
      if (text) {
        this.thinkingText += text;
        this.emit({ kind: "thinking_delta", text });
      }
      return;
    }

    if (deltaType === "input_json_delta") {
      const partial = asString(delta.partial_json) ?? "";
      if (partial) {
        this.emit({
          kind: "tool_input",
          tool: "tool",
          input: partial,
        });
      }
    }
  }

  private handleAssistantMessage(record: Record<string, unknown>) {
    const message = asRecord(record.message);
    const content = message?.content;
    if (!Array.isArray(content)) return;

    for (const block of content) {
      const item = asRecord(block);
      if (!item) continue;

      const blockType = asString(item.type);

      if (blockType === "thinking") {
        const text = asString(item.thinking) ?? "";
        if (text) {
          this.thinkingText = text;
          this.emit({ kind: "thinking", text });
        }
        continue;
      }

      if (blockType === "text") {
        const text = asString(item.text) ?? "";
        if (text) {
          this.finalText += text;
          this.emit({ kind: "text_delta", text });
        }
        continue;
      }

      if (blockType === "tool_use") {
        const tool = asString(item.name) ?? "tool";
        const toolUseId = asString(item.id);
        if (toolUseId) {
          this.activeTools.set(toolUseId, tool);
        }
        this.emit({
          kind: "tool_start",
          tool,
          toolUseId,
        });
        if (item.input !== undefined) {
          this.emit({
            kind: "tool_input",
            tool,
            input: item.input,
          });
        }
      }
    }
  }

  private handleUserMessage(record: Record<string, unknown>) {
    const message = asRecord(record.message);
    const content = message?.content;
    if (!Array.isArray(content)) return;

    for (const block of content) {
      const item = asRecord(block);
      if (!item) continue;

      if (asString(item.type) === "tool_result") {
        const toolUseId = asString(item.tool_use_id);
        const tool =
          (toolUseId && this.activeTools.get(toolUseId)) || "tool";
        const output =
          typeof item.content === "string"
            ? item.content
            : JSON.stringify(item.content, null, 2);

        this.emit({
          kind: "tool_result",
          tool,
          output,
        });
      }
    }
  }

  private emit(event: AgentStreamEvent) {
    this.options.onEvent(event);
  }
}

export function streamEventToActivity(
  event: AgentStreamEvent,
  current: AgentActivityItem[]
): AgentActivityItem[] {
  switch (event.kind) {
    case "thinking":
      return upsertActivity(current, {
        id: "thinking",
        kind: "thinking",
        label: "Thinking",
        detail: event.text,
        status: "running",
      });
    case "thinking_delta": {
      const existing = current.find((item) => item.id === "thinking");
      const detail = `${existing?.detail ?? ""}${event.text}`;
      return upsertActivity(current, {
        id: "thinking",
        kind: "thinking",
        label: "Thinking",
        detail,
        status: "running",
      });
    }
    case "tool_start":
      return upsertActivity(current, {
        id: `tool-${event.toolUseId ?? event.tool}`,
        kind: "tool",
        label: `Tool: ${event.tool}`,
        status: "running",
      });
    case "tool_input":
      return current.map((item) =>
        item.kind === "tool" && item.status === "running"
          ? {
              ...item,
              detail:
                typeof event.input === "string"
                  ? `${item.detail ?? ""}${event.input}`
                  : JSON.stringify(event.input, null, 2),
            }
          : item
      );
    case "tool_result":
      return current.map((item) =>
        item.kind === "tool" &&
        item.label === `Tool: ${event.tool}` &&
        item.status === "running"
          ? {
              ...item,
              status: "done",
              detail: truncate(event.output, 1200),
            }
          : item
      );
    case "system":
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          kind: "system",
          label: event.subtype,
          detail: event.message,
          status: "done",
        },
      ];
    default:
      return current;
  }
}

function upsertActivity(
  current: AgentActivityItem[],
  next: AgentActivityItem
): AgentActivityItem[] {
  const index = current.findIndex((item) => item.id === next.id);
  if (index === -1) {
    return [...current, next];
  }

  const copy = [...current];
  copy[index] = { ...copy[index], ...next };
  return copy;
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
