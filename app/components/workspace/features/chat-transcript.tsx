"use client";

import { cn } from "@/lib/utils";

type TranscriptTurn = {
  speaker: string;
  text: string;
  isUser?: boolean;
};

function parseTranscript(text: string): TranscriptTurn[] {
  return text.split("\n\n").flatMap((block) => {
    const trimmed = block.trim();
    if (!trimmed) return [];

    const match = trimmed.match(/^([^:\n]+):\s*([\s\S]*)$/);
    if (!match) {
      return [{ speaker: "Note", text: trimmed }];
    }

    const speaker = match[1].trim();
    const isUser =
      /^(you|user|participant|interviewee|me)$/i.test(speaker) ||
      speaker.toLowerCase().includes("participant");

    return [{ speaker, text: match[2].trim(), isUser }];
  });
}

export function ChatTranscript({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const turns = parseTranscript(text);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {turns.map((turn, index) => (
        <div
          key={`${turn.speaker}-${index}`}
          className={cn("flex gap-3", turn.isUser && "flex-row-reverse")}
        >
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-medium text-[var(--text-primary)]",
              !turn.isUser &&
                "bg-[var(--brand-muted)] text-[var(--brand)]"
            )}
          >
            {turn.speaker.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-[var(--text-tertiary)]">
              {turn.speaker}
            </p>
            <div
              className={cn(
                "max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed",
                turn.isUser
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "bg-[var(--surface-muted)] text-left text-[var(--text-primary)]"
              )}
            >
              {turn.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatInsight({
  label,
  children,
  action,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
        <span aria-hidden>✦</span>
        {label}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
      {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
