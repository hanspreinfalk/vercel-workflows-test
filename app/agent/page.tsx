import { PageContainer } from "@/app/components/shell/site-header";
import { AgentChatPanel } from "@/app/components/agent-chat-panel";

export default function AgentPage() {
  return (
    <PageContainer className="flex h-full min-h-0 flex-col py-6 sm:py-12">
      <div className="app-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <AgentChatPanel />
      </div>
    </PageContainer>
  );
}
