"use client";

import type { CSSProperties, ReactNode } from "react";
import { AppSidebar } from "@/app/components/shell/app-sidebar";
import { OrgProvider } from "@/app/components/workspace/shell/org-context";
import type { Organization } from "@/lib/workspace/types";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AppShellProps = {
  children: ReactNode;
  organizations: Organization[];
  defaultOrgId: string;
};

function AppShellInner({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      <SidebarInset className="main-canvas relative flex h-full min-h-0 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center border-b border-border px-3 md:hidden">
          <SidebarTrigger />
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
      </SidebarInset>
    </>
  );
}

export function AppShell({
  children,
  organizations,
  defaultOrgId,
}: AppShellProps) {
  return (
    <OrgProvider organizations={organizations} defaultOrgId={defaultOrgId}>
      <SidebarProvider
        defaultOpen
        style={
          {
            "--sidebar-width": "19rem",
            "--sidebar-width-icon": "3.25rem",
          } as CSSProperties
        }
      >
        <AppShellInner>{children}</AppShellInner>
      </SidebarProvider>
    </OrgProvider>
  );
}
