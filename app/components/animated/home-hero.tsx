import { ButtonLink } from "@/app/components/shared/button";

export function HomeHero() {
  return (
    <div className="app-animate-in mx-auto max-w-6xl py-12 sm:py-16">
      <p className="mb-4 text-sm text-[var(--brand)]">Case Research</p>
      <h1 className="app-display max-w-3xl">
        From how people work to workflows that run themselves.
      </h1>
      <p className="app-subhead mt-5 max-w-xl text-base">
        Capture interviews, screen recordings, and AI insights — then turn
        them into durable agent workflows in one workspace.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <ButtonLink href="/participants" size="lg">
          Get started
        </ButtonLink>
        <ButtonLink href="/builder" variant="secondary" size="lg">
          Open workflows
        </ButtonLink>
      </div>
    </div>
  );
}
