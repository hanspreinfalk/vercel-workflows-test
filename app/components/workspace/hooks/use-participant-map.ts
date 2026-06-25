"use client";

import { useMemo } from "react";
import { listParticipants } from "@/lib/workspace/org-store";
import type { Participant } from "@/lib/workspace/types";

export function useParticipantMap(orgId: string) {
  const participants = useMemo(() => listParticipants(orgId), [orgId]);

  const participantById = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants]
  );

  return { participants, participantById };
}

export function getParticipantFromMap(
  map: Map<string, Participant>,
  id: string
): Participant | undefined {
  return map.get(id);
}
