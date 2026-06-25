import { PageContainer, PageHero } from "@/app/components/shell/site-header";
import { SandboxPlayground } from "@/app/components/sandbox-playground";

export default function SandboxPage() {
  return (
    <PageContainer narrow>
      <PageHero
        eyebrow="Isolated execution"
        title="Code playground"
        description="Each run creates a fresh microVM, executes your script with Node.js 24, and returns stdout/stderr."
      />
      <div className="app-card p-6 sm:p-8">
        <SandboxPlayground />
      </div>
    </PageContainer>
  );
}
