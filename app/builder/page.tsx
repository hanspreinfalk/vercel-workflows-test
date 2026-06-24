import Link from "next/link";
import { SiteHeader } from "@/app/components/site-header";
import { listFlows } from "@/lib/flow-store";

export const dynamic = "force-dynamic";

export default function BuilderIndexPage() {
  const flows = listFlows();

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader active="builder" />
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Workflow builder
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Visual agent flows
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Compose Claude Code nodes with per-node sandboxes and permissions.
              Runs execute on the Vercel Workflow engine — each node is a durable
              step with its own isolated sandbox.
            </p>
          </div>
          <NewFlowButton />
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-900 dark:text-amber-200">
          API keys entered in the builder are stored in memory for demo purposes
          and passed into workflow runs. Use scoped tokens and rotate them
          regularly.
        </div>

        <div className="mt-8 space-y-3">
          {flows.length === 0 ? (
            <p className="text-sm text-zinc-500">No flows yet.</p>
          ) : (
            flows.map((flow) => (
              <Link
                key={flow.id}
                href={`/builder/${flow.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-violet-500/30 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {flow.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {flow.nodes.length} nodes · updated{" "}
                  {new Date(flow.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function NewFlowButton() {
  return (
    <Link
      href="/builder/new"
      className="inline-flex h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-medium text-white hover:bg-violet-500"
    >
      New flow
    </Link>
  );
}
