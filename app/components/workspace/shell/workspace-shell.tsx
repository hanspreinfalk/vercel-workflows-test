"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace, WorkspaceProvider } from "./workspace-context";
import { WorkflowSelector } from "./workflow-selector";
import type { WorkflowSummary } from "./workflow-selector";
import { SidebarTrigger } from "@/components/ui/sidebar";

export type WorkspaceTab =
  | "participants"
  | "interviews"
  | "recordings"
  | "assessment"
  | "workflows";

type WorkspaceShellProps = {
  children: React.ReactNode;
  flows: WorkflowSummary[];
  currentFlowId?: string | null;
  activeTab?: WorkspaceTab;
  toolbar?: React.ReactNode;
};

function WorkspaceShellInner({
  children,
  currentFlowId,
  toolbar,
}: Omit<WorkspaceShellProps, "flows" | "activeTab"> & {
  currentFlowId?: string | null;
}) {
  const { flows } = useWorkspace();
  const pathname = usePathname();
  const isWorkflows = pathname.startsWith("/builder") || Boolean(toolbar);
  const showHeader = isWorkflows || Boolean(toolbar);

  if (!showHeader) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-background/80">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
          <SidebarTrigger className="md:hidden" />

          {isWorkflows && !toolbar ? (
            <WorkflowSelector flows={flows} currentFlowId={currentFlowId} />
          ) : null}

          <div className="ml-auto hidden md:block">
            <Link
              href="/"
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Home
            </Link>
          </div>
        </div>

        {toolbar ? (
          <div className="border-t border-border bg-[var(--surface)] px-3 py-2 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
              <WorkflowSelector flows={flows} currentFlowId={currentFlowId} />
              <div className="hidden h-4 w-px bg-border sm:block" />
              <div className="workspace-toolbar-scroll flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-2.5">
                {toolbar}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export function WorkspaceShell({
  children,
  flows,
  currentFlowId,
  toolbar,
}: WorkspaceShellProps) {
  return (
    <WorkspaceProvider flows={flows}>
      <WorkspaceShellInner currentFlowId={currentFlowId} toolbar={toolbar}>
        {children}
      </WorkspaceShellInner>
    </WorkspaceProvider>
  );
}
