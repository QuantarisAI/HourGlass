"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { urgencyBand, urgencyStyles } from "@/lib/priority";
import { Task } from "@/lib/types";

export function TaskCard({ task }: { task: Task }) {
  const countdown = useCountdown(task.deadline);
  const band = task.status === "completed" ? "calm" : urgencyBand(countdown.msRemaining);
  const style = task.status === "completed" ? "border-green-600 bg-green-950/20 text-green-100" : urgencyStyles[band];

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-colors ${style}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold leading-tight">{task.title}</h3>
        {task.status === "completed" && (
          <span className="shrink-0 rounded-full bg-green-700/40 px-2 py-0.5 text-xs font-medium">
            DONE
          </span>
        )}
      </div>

      {task.description && <p className="mt-1 text-sm opacity-80">{task.description}</p>}

      <p className="mt-2 text-xs opacity-70">
        Deadline: {new Date(task.deadline).toLocaleString()}
      </p>

      {task.status !== "completed" && (
        <div className="mt-3 font-mono text-2xl tabular-nums">{countdown.label}</div>
      )}

      {band === "urgent" && task.status !== "completed" && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide">⚠ Due within 24 hours</p>
      )}
      {band === "overdue" && task.status !== "completed" && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide">⛔ Overdue</p>
      )}
    </div>
  );
}
