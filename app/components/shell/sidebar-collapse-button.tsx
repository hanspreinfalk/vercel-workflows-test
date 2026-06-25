"use client";

import { ChevronsLeft } from "lucide-react";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarMenuButton
      onClick={toggleSidebar}
      tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="text-muted-foreground hover:text-sidebar-foreground"
    >
      <ChevronsLeft
        className={cn(
          "size-4 shrink-0 transition-transform duration-200",
          collapsed && "rotate-180"
        )}
      />
      <span className="group-data-[collapsible=icon]:sr-only">
        {collapsed ? "Expand sidebar" : "Collapse sidebar"}
      </span>
    </SidebarMenuButton>
  );
}
