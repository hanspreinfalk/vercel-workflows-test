"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--brand)",
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#64748b",
  "#94a3b8",
];

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("viz-card", className)}>
      <div className="viz-card__head">
        <h3 className="viz-card__title">{title}</h3>
        {subtitle ? <p className="viz-card__subtitle">{subtitle}</p> : null}
      </div>
      <div className="viz-card__body">{children}</div>
    </div>
  );
}

export function MetricRing({
  value,
  label,
  suffix = "%",
  size = 88,
}: {
  value: number;
  label: string;
  suffix?: string;
  size?: number;
}) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="viz-metric-ring">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="viz-metric-ring__value">
        {value}
        {suffix}
      </div>
      <p className="viz-metric-ring__label">{label}</p>
    </div>
  );
}

export function ProgressBars({
  items,
}: {
  items: Array<{ label: string; value: number; hint?: string }>;
}) {
  return (
    <div className="viz-progress-list">
      {items.map((item) => (
        <div key={item.label} className="viz-progress-item">
          <div className="viz-progress-item__head">
            <span className="viz-progress-item__label">{item.label}</span>
            <span className="viz-progress-item__value">{item.value}%</span>
          </div>
          <div className="viz-progress-item__track">
            <div
              className="viz-progress-item__fill"
              style={{ width: `${Math.min(100, item.value)}%` }}
            />
          </div>
          {item.hint ? (
            <p className="viz-progress-item__hint">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function VizBarChart({
  data,
  dataKey = "value",
  nameKey = "name",
  height = 220,
  layout = "vertical",
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  nameKey?: string;
  height?: number;
  layout?: "vertical" | "horizontal";
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 4, right: 8, left: layout === "vertical" ? 0 : -16, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        {layout === "vertical" ? (
          <>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey={nameKey}
              width={100}
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={nameKey}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
          </>
        )}
        <Tooltip
          contentStyle={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            fontSize: "0.8125rem",
          }}
          cursor={{ fill: "var(--surface-muted)" }}
        />
        <Bar dataKey={dataKey} radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VizRadarChart({
  data,
  height = 280,
}: {
  data: Array<{ dimension: string; score: number; fullMark: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
        />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="score"
          stroke="var(--brand)"
          fill="var(--brand)"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            fontSize: "0.8125rem",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function VizActivityChart({
  data,
  height = 160,
}: {
  data: Array<{ bucket: string; events: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            fontSize: "0.8125rem",
          }}
        />
        <Bar dataKey="events" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VizStackedLegend({
  items,
}: {
  items: Array<{ label: string; value: number; color?: string }>;
}) {
  return (
    <div className="viz-legend">
      {items.map((item, i) => (
        <div key={item.label} className="viz-legend__item">
          <span
            className="viz-legend__dot"
            style={{ background: item.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
          />
          <span className="viz-legend__label">{item.label}</span>
          <span className="viz-legend__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ScoreHero({
  score,
  label,
  summary,
}: {
  score: number;
  label: string;
  summary: string;
}) {
  return (
    <div className="viz-score-hero">
      <div className="viz-score-hero__ring">
        <MetricRing value={score} label={label} size={120} />
      </div>
      <p className="viz-score-hero__summary">{summary}</p>
    </div>
  );
}

export function ImpactEffortChart({
  ideas,
}: {
  ideas: Array<{ title: string; impactScore: number; effortScore: number; roiScore: number }>;
}) {
  const data = ideas.map((idea) => ({
    name: idea.title.length > 22 ? `${idea.title.slice(0, 20)}…` : idea.title,
    impact: idea.impactScore,
    effort: idea.effortScore,
    roi: idea.roiScore,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          angle={-18}
          textAnchor="end"
          height={56}
        />
        <YAxis domain={[0, 100]} tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
        <Bar dataKey="impact" name="Impact" fill="var(--brand)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="effort" name="Effort" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="roi" name="ROI" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
