import { cn } from "@/lib/utils";

export function WorkspaceCard({
  children,
  className,
  glow,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        glow && "border-brand/20",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/** @deprecated Use WorkspaceCard */
export const MagicCard = WorkspaceCard;
