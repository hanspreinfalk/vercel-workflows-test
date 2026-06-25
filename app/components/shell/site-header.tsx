import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  narrow,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-4 py-8 sm:px-8 sm:py-16",
        narrow ? "max-w-3xl" : "max-w-6xl",
        className
      )}
    >
      {children}
    </main>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="app-animate-in mb-10 max-w-2xl">
      <p className="app-eyebrow mb-3">{eyebrow}</p>
      <h1 className="app-headline">{title}</h1>
      <p className="app-subhead mt-3 text-base leading-relaxed">{description}</p>
    </div>
  );
}
