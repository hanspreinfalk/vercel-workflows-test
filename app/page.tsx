import { SignupForm } from "@/app/components/signup-form";
import { StartWorkflowButton } from "@/app/components/start-workflow-button";
import { HomeHero } from "@/app/components/animated/home-hero";
import { FeatureCards } from "@/app/components/animated/feature-cards";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <section className="border-b border-border px-4 py-4 sm:px-8">
        <HomeHero />
      </section>

      <FeatureCards />

      <section className="border-t border-border px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="app-headline text-xl">User signup workflow</h2>
            <p className="app-subhead mt-3 max-w-md">
              Start a durable signup workflow and watch each step complete in
              real time. Logic lives in{" "}
              <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                workflows/
              </code>
              .
            </p>
          </div>
          <div className="app-card p-6 sm:p-8">
            <SignupForm />
            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">
                Or start instantly with a demo email.
              </p>
              <StartWorkflowButton label="Start demo workflow" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
