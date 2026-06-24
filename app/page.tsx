import Link from "next/link";
import { SiteHeader } from "@/app/components/site-header";
import { SignupForm } from "@/app/components/signup-form";
import { StartWorkflowButton } from "@/app/components/start-workflow-button";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader active="workflow" />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-3">
          <main className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-1">
            <div className="mb-8 flex flex-col gap-3">
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Vercel Workflow
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                User signup demo
              </h1>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Start a durable signup workflow and watch each step complete in
                real time. The UI can start new runs; workflow logic itself is
                defined in code under{" "}
                <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
                  workflows/
                </code>
                .
              </p>
            </div>
            <SignupForm />
            <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">
                Or start instantly with a demo email — no form required.
              </p>
              <StartWorkflowButton label="Start demo workflow" />
            </div>
          </main>

          <section className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Vercel Sandbox
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Run code safely
              </h2>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Execute JavaScript in an isolated microVM with network access
                disabled.
              </p>
            </div>
            <Link
              href="/sandbox"
              className="mt-8 flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
            >
              Open sandbox playground
            </Link>
          </section>

          <section className="flex flex-col justify-between rounded-3xl border border-violet-500/20 bg-white p-8 shadow-sm dark:border-violet-500/20 dark:bg-zinc-950">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Claude Code
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                AI coding agent
              </h2>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Run Claude Code inside a Vercel Sandbox to generate files, run
                commands, and complete coding tasks in isolation.
              </p>
            </div>
            <Link
              href="/agent"
              className="mt-8 flex h-12 items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              Open agent playground
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
