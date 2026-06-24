import { SiteHeader } from "@/app/components/site-header";
import { AgentChatPanel } from "@/app/components/agent-chat-panel";

export default function AgentPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader active="agent" />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Claude Code + Vercel Sandbox
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Agent chat
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Start a new conversation or resume a previous one. Each chat keeps
            its sandbox and Claude Code session alive until you stop it.
          </p>
        </div>
        <AgentChatPanel />
      </main>
    </div>
  );
}
