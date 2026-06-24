import { SiteHeader } from "@/app/components/site-header";
import { ClaudeAgentPlayground } from "@/app/components/claude-agent-playground";

export default function AgentPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader active="agent" />
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Claude Code + Vercel Sandbox
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            AI coding agent
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Each run creates a fresh microVM, installs Claude Code, and executes
            your prompt in isolation. Add{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              ANTHROPIC_API_KEY
            </code>{" "}
            or{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              AI_GATEWAY_API_KEY
            </code>{" "}
            to{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              .env.local
            </code>
            . First runs can take a minute while Claude Code installs.
          </p>
        </div>
        <ClaudeAgentPlayground />
      </main>
    </div>
  );
}
