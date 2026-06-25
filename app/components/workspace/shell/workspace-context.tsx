"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useOrg } from "./org-context";
import type { WorkflowSummary } from "./workflow-selector";

type WorkspaceContextValue = {
  orgId: string;
  setOrgId: (orgId: string) => void;
  organizations: ReturnType<typeof useOrg>["organizations"];
  flows: WorkflowSummary[];
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  flows,
  children,
}: {
  flows: WorkflowSummary[];
  children: ReactNode;
}) {
  const { orgId, setOrgId, organizations } = useOrg();

  const value = useMemo(
    () => ({ orgId, setOrgId, organizations, flows }),
    [orgId, setOrgId, organizations, flows]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
