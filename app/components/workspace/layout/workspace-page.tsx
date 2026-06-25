import { cn } from "@/lib/utils";

type WorkspacePageProps = {
  children: React.ReactNode;
  className?: string;
};

export function WorkspaceAmbient({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--background)]">
      {children}
    </div>
  );
}

export function WorkspacePage({ children, className }: WorkspacePageProps) {
  return (
    <WorkspaceAmbient>
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col overflow-y-auto px-4 py-5 sm:px-8 sm:py-8",
          className
        )}
      >
        {children}
      </div>
    </WorkspaceAmbient>
  );
}

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="app-eyebrow mb-1.5">{eyebrow}</p>
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function HierarchyStrip({
  items,
}: {
  items: Array<{ label: string; active?: boolean }>;
}) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-[var(--text-tertiary)]">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? <span className="text-[var(--text-tertiary)]">/</span> : null}
          <span
            className={
              item.active
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)]"
            }
          >
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

export { MagicCard, WorkspaceCard } from "./workspace-card";
