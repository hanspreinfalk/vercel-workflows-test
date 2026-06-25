"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  ChartCard,
  ImpactEffortChart,
  ProgressBars,
  ScoreHero,
  VizBarChart,
  VizRadarChart,
} from "@/app/components/chatzy/charts";
import { WorkspacePage } from "@/app/components/workspace/layout/workspace-page";
import { useWorkspace } from "@/app/components/workspace/shell/workspace-context";
import { buildOrgAssessment } from "@/lib/workspace/assessment";
import { GenerateWorkflowButton } from "@/app/components/workspace/features/generate-workflow-button";

export function AssessmentView() {
  const { orgId } = useWorkspace();
  const assessment = useMemo(() => buildOrgAssessment(orgId), [orgId]);

  return (
    <WorkspacePage className="overflow-hidden p-0 sm:p-0">
      <div className="assessment-dashboard">
        <div className="assessment-dashboard__inner">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-[var(--brand)]">
                <Sparkles className="size-4" />
                AI assessment
              </p>
              <h1 className="mt-1 text-2xl font-medium tracking-tight text-[var(--text-primary)]">
                Process intelligence report
              </h1>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                Synthesized from interviews, session recordings, and behavioral signals
              </p>
            </div>
            <Link
              href="/builder"
              className="workspace-btn-primary w-full rounded-full px-5 py-2.5 text-center text-sm font-medium sm:w-auto"
            >
              Build automations
            </Link>
          </header>

          <section className="mt-6">
            <ScoreHero
              score={assessment.overallScore}
              label="Automation readiness"
              summary={assessment.summary}
            />
          </section>

          <section className="assessment-section">
            <h2 className="assessment-section__title">Org health radar</h2>
            <div className="assessment-grid-2">
              <ChartCard
                title="Six-dimension maturity"
                subtitle="Where the org is strong vs. fragile"
              >
                <VizRadarChart data={assessment.radar} height={300} />
              </ChartCard>
              <ChartCard
                title="Time lost by category"
                subtitle="Estimated hours per week (from research signals)"
              >
                <VizBarChart
                  data={assessment.timeByCategory.map((c) => ({
                    name: c.category,
                    value: c.hours,
                  }))}
                  layout="horizontal"
                  height={280}
                />
              </ChartCard>
            </div>
          </section>

          <section className="assessment-section">
            <h2 className="assessment-section__title">Critical bottlenecks</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {assessment.bottlenecks.map((item) => (
                <article key={item.id} className="assessment-bottleneck">
                  <div className="assessment-bottleneck__head">
                    <h3 className="assessment-bottleneck__title">{item.title}</h3>
                    <span className="assessment-bottleneck__severity">
                      {item.severity}% severity
                    </span>
                  </div>
                  <p className="assessment-bottleneck__desc">{item.description}</p>
                  <p className="assessment-bottleneck__meta">
                    ~{item.hoursPerWeek}h/week · {item.category} ·{" "}
                    {item.affectedRoles.join(", ")}
                  </p>
                  <div className="mt-3">
                    <div className="viz-progress-item__track">
                      <div
                        className="viz-progress-item__fill"
                        style={{ width: `${item.severity}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="assessment-section">
            <h2 className="assessment-section__title">Inefficiencies detected</h2>
            <ChartCard title="Impact ranking" subtitle="Highest-friction patterns first">
              <VizBarChart
                data={assessment.inefficiencies.map((i) => ({
                  name: i.label.length > 28 ? `${i.label.slice(0, 26)}…` : i.label,
                  value: i.impact,
                }))}
                layout="horizontal"
                height={Math.max(200, assessment.inefficiencies.length * 38)}
              />
              <ProgressBars
                items={assessment.inefficiencies.slice(0, 5).map((i) => ({
                  label: `${i.label} (${i.frequency})`,
                  value: i.impact,
                  hint: `Source: ${i.source}`,
                }))}
              />
            </ChartCard>
          </section>

          <section className="assessment-section">
            <h2 className="assessment-section__title">Automation opportunities</h2>
            <ChartCard
              title="Impact vs effort vs ROI"
              subtitle="Prioritized automation ideas from cross-interview synthesis"
            >
              <ImpactEffortChart ideas={assessment.automationIdeas} />
            </ChartCard>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {assessment.automationIdeas.map((idea) => (
                <article key={idea.id} className="assessment-idea">
                  <h3 className="assessment-idea__title">{idea.title}</h3>
                  <p className="assessment-idea__desc">{idea.description}</p>
                  <div className="assessment-idea__bars">
                    <ProgressBars
                      items={[
                        { label: "Impact", value: idea.impactScore },
                        { label: "ROI score", value: idea.roiScore },
                        {
                          label: "Effort (lower is better)",
                          value: 100 - idea.effortScore,
                        },
                      ]}
                    />
                  </div>
                  <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                    Saves ~{idea.minutesSavedPerWeek} min/week
                  </p>
                  {idea.linkedInterviewIds[0] ? (
                    <div className="mt-3">
                      <GenerateWorkflowButton
                        interviewId={idea.linkedInterviewIds[0]}
                        label="Generate workflow"
                      />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="assessment-section">
            <h2 className="assessment-section__title">Research maturity</h2>
            <div className="assessment-grid-2">
              <ChartCard title="Program progress" subtitle="Current vs target coverage">
                <ProgressBars
                  items={assessment.maturityProgress.map((m) => ({
                    label: m.area,
                    value: m.current,
                    hint: `Target: ${m.target}%`,
                  }))}
                />
              </ChartCard>
              <ChartCard
                title="Automation potential by participant"
                subtitle="From interview + session signals"
              >
                <VizBarChart
                  data={assessment.participantScores.map((p) => ({
                    name: p.name.split(" ")[0],
                    value: p.automationPotential,
                  }))}
                  layout="horizontal"
                  height={Math.max(140, assessment.participantScores.length * 40)}
                />
              </ChartCard>
            </div>
          </section>
        </div>
      </div>
    </WorkspacePage>
  );
}
