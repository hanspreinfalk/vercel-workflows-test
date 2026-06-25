import Link from "next/link";

const features = [
  {
    title: "Participants",
    description:
      "Organizations, participants, interviews with AI analysis, and screen recordings.",
    href: "/participants",
  },
  {
    title: "Workflows",
    description:
      "Design flows on a canvas and let the assistant build and debug from run logs.",
    href: "/builder",
  },
  {
    title: "Sandbox",
    description:
      "Execute JavaScript in a fresh microVM. Safe, fast, and disposable.",
    href: "/sandbox",
  },
  {
    title: "Agent",
    description:
      "Multi-turn agent sessions in an isolated sandbox with live streaming.",
    href: "/agent",
  },
];

export function FeatureCards() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 sm:py-14">
      <div className="mb-8 max-w-2xl">
        <h2 className="app-headline text-2xl">Everything in one workspace</h2>
        <p className="app-subhead mt-2">
          From discovery to deployment — research, analyze, and ship without
          switching tools.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="group block rounded-xl border border-border bg-card p-6 transition hover:border-[color-mix(in_oklab,var(--brand)_18%,var(--border))] hover:bg-[var(--surface-elevated)] hover:shadow-[var(--shadow-soft)]"
          >
            <h3 className="text-base font-medium text-foreground">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground transition group-hover:text-foreground/80">
              {feature.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
