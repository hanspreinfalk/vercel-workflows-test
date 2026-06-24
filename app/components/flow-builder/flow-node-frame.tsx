"use client";

import type { ReactNode } from "react";
import {
  getNodeRunBorderClass,
  type NodeRunStatus,
} from "./node-run-styles";

type FlowNodeFrameProps = {
  children: ReactNode;
  runStatus?: NodeRunStatus;
  selected: boolean;
  accent: "violet" | "emerald" | "red";
  className?: string;
};

export function FlowNodeFrame({
  children,
  runStatus,
  selected,
  accent,
  className = "",
}: FlowNodeFrameProps) {
  if (runStatus === "started") {
    return (
      <div className={`flow-node-spinner rounded-xl ${className}`}>
        <div className="flow-node-spinner__inner">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm dark:bg-zinc-950 ${getNodeRunBorderClass(
        runStatus,
        selected,
        accent
      )} ${className}`}
    >
      {children}
    </div>
  );
}
