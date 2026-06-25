import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/workspace/format";
import type { Participant } from "@/lib/workspace/types";

export function ParticipantCell({
  participant,
}: {
  participant?: Pick<Participant, "name" | "role"> | null;
}) {
  const name = participant?.name ?? "Unknown";

  return (
    <div className="flex items-center gap-2.5">
      <Avatar size="sm">
        <AvatarFallback className="text-[10px] font-medium">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {participant?.role ?? "—"}
        </p>
      </div>
    </div>
  );
}
