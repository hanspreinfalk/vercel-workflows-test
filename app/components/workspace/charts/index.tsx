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

/** Brand-aligned palette — no mixed purple/indigo */
export const CHART_COLORS = {
  brand: "var(--brand)",
  brandLight: "color-mix(in oklab, var(--brand) 55%, white)",
  brandDark: "color-mix(in oklab, var(--brand) 85%, black)",
  secondary: "var(--text-secondary)",
  tertiary: "var(--text-tertiary)",
  muted: "var(--surface-muted)",
  series: [
    "var(--brand)",
    "color-mix(in oklab, var(--brand) 70%, #19c37d)",
    "color-mix(in oklab, var(--brand) 45%, var(--text-secondary))",
    "var(--text-secondary)",
    "var(--text-tertiary)",
    "color-mix(in oklab, var(--brand) 25%, var(--text-tertiary))",
  ] as const,
};

const tooltipStyle = {
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  fontSize: "0.8125rem",
  color: "var(--text-primary)",
  boxShadow: "var(--shadow-soft)",
};

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
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
    >
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="overflow-x-auto p-4 sm:p-5">{children}</div>
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
    <div className="relative flex flex-col items-center gap-1">
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
      <div className="absolute inset-0 flex items-center justify-center pt-0.5 text-xl font-semibold tracking-tight text-foreground">
        {value}
        {suffix}
      </div>
      <p className="max-w-[8rem] text-center text-[11px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function ProgressBars({
  items,
  barClassName,
}: {
  items: Array<{ label: string; value: number; hint?: string }>;
  barClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-foreground">{item.label}</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {item.value}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-[var(--brand)] transition-all",
                barClassName
              )}
              style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
            />
          </div>
          {item.hint ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
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
  singleColor = false,
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  nameKey?: string;
  height?: number;
  layout?: "vertical" | "horizontal";
  /** Use brand color for all bars */
  singleColor?: boolean;
}) {
  const isHorizontal = layout === "horizontal";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{
          top: 4,
          right: 8,
          left: isHorizontal ? 0 : -8,
          bottom: isHorizontal ? 4 : 0,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        {isHorizontal ? (
          <>
            <XAxis
              dataKey={nameKey}
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={data.length > 4 ? -12 : 0}
              textAnchor={data.length > 4 ? "end" : "middle"}
              height={data.length > 4 ? 48 : 32}
            />
            <YAxis hide />
          </>
        ) : (
          <>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey={nameKey}
              width={108}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
          </>
        )}
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "var(--surface-muted)" }}
        />
        <Bar
          dataKey={dataKey}
          radius={isHorizontal ? [4, 4, 0, 0] : [0, 6, 6, 0]}
          maxBarSize={32}
          fill={CHART_COLORS.brand}
        >
          {!singleColor
            ? data.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHART_COLORS.series[index % CHART_COLORS.series.length]}
                />
              ))
            : null}
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
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="var(--brand)"
          fill="var(--brand)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip contentStyle={tooltipStyle} />
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
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="bucket"
          tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey="events"
          fill="var(--brand)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
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
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item, i) => (
        <div
          key={item.label}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{
              background:
                item.color ?? CHART_COLORS.series[i % CHART_COLORS.series.length],
            }}
          />
          <span>{item.label}</span>
          <span className="font-medium tabular-nums text-foreground">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ScoreHero({
  score,
  label,
  summary,
  children,
}: {
  score: number;
  label: string;
  summary: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
      <MetricRing value={score} label={label} size={120} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        {children}
      </div>
    </div>
  );
}

export function ImpactEffortChart({
  ideas,
}: {
  ideas: Array<{
    title: string;
    impactScore: number;
    effortScore: number;
    roiScore: number;
  }>;
}) {
  const data = ideas.map((idea) => ({
    name: idea.title.length > 20 ? `${idea.title.slice(0, 18)}…` : idea.title,
    impact: idea.impactScore,
    effort: idea.effortScore,
    roi: idea.roiScore,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          angle={-16}
          textAnchor="end"
          height={48}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
        />
        <Bar
          dataKey="impact"
          name="Impact"
          fill="var(--brand)"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
        <Bar
          dataKey="effort"
          name="Effort"
          fill="color-mix(in oklab, var(--brand) 45%, var(--text-secondary))"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
        <Bar
          dataKey="roi"
          name="ROI"
          fill="color-mix(in oklab, var(--brand) 70%, #19c37d)"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
