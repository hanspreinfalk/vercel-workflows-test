import Link from "next/link";

type SiteHeaderProps = {
  active?: "home" | "workflow" | "builder" | "sandbox" | "agent";
};

const links = [
  { href: "/", label: "Workflow", id: "workflow" as const },
  { href: "/builder", label: "Builder", id: "builder" as const },
  { href: "/sandbox", label: "Sandbox", id: "sandbox" as const },
  { href: "/agent", label: "Agent", id: "agent" as const },
];

export function SiteHeader({ active = "home" }: SiteHeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          vercel-workflows-test
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active === link.id
                  ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
