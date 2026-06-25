import type {
  Interview,
  Organization,
  Participant,
  ScreenRecording,
} from "@/lib/workspace/types";

export type WorkspaceStoreData = {
  orgs: Organization[];
  participants: Participant[];
  interviews: Interview[];
  recordings: ScreenRecording[];
};

export function createDemoWorkspaceStore(): WorkspaceStoreData {
  return {
    orgs: [
      {
        id: "org-demo",
        name: "Acme Research",
        slug: "acme-research",
      },
    ],
    participants: [
      {
        id: "p-1",
        orgId: "org-demo",
        name: "Jordan Lee",
        email: "jordan@acme.io",
        role: "Operations lead",
        interviewCount: 3,
        recordingCount: 5,
        lastActiveAt: Date.now() - 1000 * 60 * 60 * 2,
      },
      {
        id: "p-2",
        orgId: "org-demo",
        name: "Sam Rivera",
        email: "sam@acme.io",
        role: "Product analyst",
        interviewCount: 2,
        recordingCount: 8,
        lastActiveAt: Date.now() - 1000 * 60 * 60 * 26,
      },
      {
        id: "p-3",
        orgId: "org-demo",
        name: "Alex Chen",
        email: "alex@acme.io",
        role: "Engineering",
        interviewCount: 1,
        recordingCount: 2,
        lastActiveAt: Date.now() - 1000 * 60 * 60 * 72,
      },
    ],
    interviews: [
      {
        id: "int-1",
        orgId: "org-demo",
        participantId: "p-1",
        title: "Q2 workflow discovery",
        status: "completed",
        summary:
          "Manual onboarding across three spreadsheets with four handoffs before client approval.",
        transcriptPreview:
          "Interviewer: Walk me through what happens when a new client signs.\n\nJordan: We start every client onboarding with a manual checklist in three spreadsheets. First I copy their details from the CRM, then I paste into our intake sheet and the billing tracker. Legal review happens in email — I attach the contract PDF, wait for a reply, then update status by hand.\n\nInterviewer: Where do things slow down?\n\nJordan: The handoff between sales and ops. Nobody owns the transition, so deals sit for a day or two. We also re-enter the same client ID in four different tools.",
        analysisPreview:
          "Jordan's onboarding flow has high automation potential. Four repetitive handoffs were identified between CRM export, intake spreadsheet, billing tracker, and legal email thread.\n\nRecommended workflow: doc collection → automated legal review queue → ops approval → CRM status sync.\n\nEstimated time saved: ~45 minutes per client.",
        themes: ["Onboarding", "Handoffs", "CRM", "Automation"],
        durationMin: 42,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
        recordingId: "rec-1",
      },
      {
        id: "int-2",
        orgId: "org-demo",
        participantId: "p-2",
        title: "Support triage deep-dive",
        status: "analyzing",
        summary:
          "Ticket triage requires copying customer IDs across two internal tools before responding.",
        transcriptPreview:
          "Interviewer: What happens when a support ticket arrives?\n\nSam: When a ticket arrives, I copy the customer ID, open two internal tools, and paste context into each one. I check billing status in one, usage limits in the other, then draft a reply in Zendesk.\n\nInterviewer: How long does a typical ticket take?\n\nSam: Simple ones, maybe eight minutes. Anything with billing history takes fifteen because I'm tab-switching constantly.",
        analysisPreview:
          "Analysis in progress. Early signals point to context-switching between billing and usage dashboards as the primary bottleneck.",
        themes: ["Support", "Context switching"],
        durationMin: 28,
        createdAt: Date.now() - 1000 * 60 * 60 * 5,
        recordingId: "rec-2",
      },
      {
        id: "int-3",
        orgId: "org-demo",
        participantId: "p-3",
        title: "Deploy checklist review",
        status: "completed",
        summary:
          "Release process relies on a shared doc and Slack confirmations with no single source of truth.",
        transcriptPreview:
          "Interviewer: Describe your release process.\n\nAlex: Before any deploy, I walk through a shared Google Doc checklist. Each step needs a Slack emoji reaction from whoever owns it — infra, QA, product. If someone is offline, we wait or skip and hope.\n\nInterviewer: What would make this easier?\n\nAlex: One place that shows green/red status per step, tied to CI. Right now I ping three channels to confirm we're clear.",
        analysisPreview:
          "Deploy checklist is a strong workflow candidate. Key insight: replace Slack emoji confirmations with automated CI gate checks and a single status dashboard.\n\nRisk identified: steps are skipped when owners are offline.",
        themes: ["Deploy", "CI/CD", "Checklists"],
        durationMin: 35,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        recordingId: "rec-4",
      },
      {
        id: "int-4",
        orgId: "org-demo",
        participantId: "p-1",
        title: "Weekly reporting cadence",
        status: "scheduled",
        summary:
          "Scheduled follow-up to map the Friday reporting ritual across teams.",
        transcriptPreview:
          "Interview scheduled. Pre-session notes: Jordan mentioned a recurring Friday export from CRM → Excel → slide deck for leadership.",
        analysisPreview:
          "Awaiting session. Prep focus: identify data sources, manual copy steps, and stakeholders who consume the report.",
        themes: ["Reporting"],
        durationMin: 30,
        createdAt: Date.now() + 1000 * 60 * 60 * 24,
      },
    ],
    recordings: [
      {
        id: "rec-1",
        orgId: "org-demo",
        participantId: "p-1",
        title: "CRM export routine",
        summary:
          "Full screen capture of the weekly CRM → spreadsheet export and column cleanup.",
        durationSec: 842,
        capturedAt: Date.now() - 1000 * 60 * 60 * 8,
      },
      {
        id: "rec-2",
        orgId: "org-demo",
        participantId: "p-2",
        title: "Invoice reconciliation",
        summary:
          "Matching Stripe payouts to internal ledger rows with manual filters.",
        durationSec: 1260,
        capturedAt: Date.now() - 1000 * 60 * 60 * 30,
      },
      {
        id: "rec-3",
        orgId: "org-demo",
        participantId: "p-2",
        title: "Zendesk macro setup",
        summary:
          "Creating and testing canned responses while cross-referencing billing data.",
        durationSec: 540,
        capturedAt: Date.now() - 1000 * 60 * 60 * 52,
      },
      {
        id: "rec-4",
        orgId: "org-demo",
        participantId: "p-3",
        title: "Staging deploy walkthrough",
        summary:
          "Step-by-step deploy to staging with manual smoke tests in three browser tabs.",
        durationSec: 1920,
        capturedAt: Date.now() - 1000 * 60 * 60 * 72,
      },
      {
        id: "rec-5",
        orgId: "org-demo",
        participantId: "p-1",
        title: "Client intake form",
        summary:
          "Filling intake fields across web form, CRM, and shared drive folder creation.",
        durationSec: 615,
        capturedAt: Date.now() - 1000 * 60 * 60 * 96,
      },
    ],
  };
}
