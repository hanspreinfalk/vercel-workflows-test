"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Organization } from "@/lib/workspace/types";

const ORG_STORAGE_KEY = "workspace-org-id";

type OrgContextValue = {
  orgId: string;
  setOrgId: (orgId: string) => void;
  organizations: Organization[];
  currentOrganization: Organization | undefined;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  organizations,
  defaultOrgId,
  children,
}: {
  organizations: Organization[];
  defaultOrgId: string;
  children: ReactNode;
}) {
  const [orgId, setOrgIdState] = useState(defaultOrgId);

  useEffect(() => {
    const stored = localStorage.getItem(ORG_STORAGE_KEY);
    if (stored && organizations.some((org) => org.id === stored)) {
      setOrgIdState(stored);
    }
  }, [organizations]);

  const setOrgId = (nextOrgId: string) => {
    setOrgIdState(nextOrgId);
    localStorage.setItem(ORG_STORAGE_KEY, nextOrgId);
  };

  const currentOrganization = organizations.find((org) => org.id === orgId);

  const value = useMemo(
    () => ({ orgId, setOrgId, organizations, currentOrganization }),
    [orgId, organizations, currentOrganization]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return context;
}
