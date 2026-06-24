import { SiteHeader } from "@/app/components/site-header";
import { SandboxPlayground } from "@/app/components/sandbox-playground";

export default function SandboxPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader active="sandbox" />
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Vercel Sandbox
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Code playground
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Each run creates a fresh microVM, executes your script with Node.js
            24, and returns stdout/stderr. For local development, link your
            Vercel project and run{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              vercel env pull
            </code>
            .
          </p>
        </div>
        <SandboxPlayground />
      </main>
    </div>
  );
}
