"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BarChart3,
  Home,
  MessageSquare,
  Terminal,
  Users,
  Video,
  Workflow,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/app/components/shell/theme-toggle";
import { SidebarCollapseButton } from "@/app/components/shell/sidebar-collapse-button";
import { SidebarOrganizationSwitcher } from "@/app/components/shell/sidebar-organization-switcher";
import { UserProfileMenu } from "@/app/components/shell/user-profile-menu";

const mainNav = [
  { href: "/", label: "Home", icon: Home, match: (path: string) => path === "/" },
  {
    href: "/participants",
    label: "Participants",
    icon: Users,
    match: (path: string) => path.startsWith("/participants"),
  },
  {
    href: "/interviews",
    label: "Interviews",
    icon: MessageSquare,
    match: (path: string) => path.startsWith("/interview"),
  },
  {
    href: "/recordings",
    label: "Recordings",
    icon: Video,
    match: (path: string) => path.startsWith("/recordings"),
  },
  {
    href: "/assessment",
    label: "Assessment",
    icon: BarChart3,
    match: (path: string) => path.startsWith("/assessment"),
  },
];

const buildNav = [
  {
    href: "/builder",
    label: "Workflows",
    icon: Workflow,
    match: (path: string) => path.startsWith("/builder"),
  },
  {
    href: "/sandbox",
    label: "Sandbox",
    icon: Terminal,
    match: (path: string) => path.startsWith("/sandbox"),
  },
  {
    href: "/agent",
    label: "Agent",
    icon: Bot,
    match: (path: string) => path.startsWith("/agent"),
  },
];

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: typeof mainNav;
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={item.match(pathname)}
                tooltip={item.label}
                render={<Link href={item.href} />}
              >
                <item.icon className="opacity-80" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="floating" collapsible="icon" className="floating-sidebar">
      <SidebarHeader className="gap-2 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand)] text-white shadow-sm">
                <Workflow className="size-4" />
              </span>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Case Research</span>
                <span className="truncate text-xs text-muted-foreground">
                  Workflow platform
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarOrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Workspace" items={mainNav} pathname={pathname} />
        <SidebarSeparator className="bg-border/60" />
        <NavGroup label="Build" items={buildNav} pathname={pathname} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarCollapseButton />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:justify-center">
              <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:sr-only">
                Theme
              </span>
              <ThemeToggle compact />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <UserProfileMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
