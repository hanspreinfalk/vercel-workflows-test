import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/components/workspace/shell/workspace-shell";
import { ButtonLink } from "@/app/components/shared/button";
import { getWorkspaceShellProps } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export default function BuilderIndexPage() {
  const shellProps = getWorkspaceShellProps();

  if (shellProps.flows.length > 0) {
    redirect(`/builder/${shellProps.flows[0].id}`);
  }

  return (
    <WorkspaceShell {...shellProps} activeTab="workflows">
      <div className="flex h-full items-center justify-center px-6 py-16">
        <div className="chatzy-card mx-auto max-w-md p-8 text-center">
          <h1 className="chatzy-page-header__title text-xl">Create your first workflow</h1>
          <p className="chatzy-page-header__desc mx-auto mt-3">
            Design agent flows visually, run them in sandboxes, and let the
            assistant refine them from real execution logs.
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/builder/new">New workflow</ButtonLink>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
