"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { urgencyBand, urgencyStyles } from "@/lib/priority";
import { Task } from "@/lib/types";

function CountdownClock({ deadline }: { deadline: string }) {
  const countdown = useCountdown(deadline);

  return (
    <div className="mt-3 flex flex-wrap items-end gap-1.5">
      {countdown.isOverdue && (
        <span className="mr-1 self-center rounded bg-red-700 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Overdue
        </span>
      )}
      {countdown.segments.map((seg, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className="rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-lg font-bold tabular-nums leading-none">
            {String(seg.value).padStart(seg.pad, "0")}
          </span>
          <span className="mt-0.5 text-[9px] uppercase tracking-wide opacity-60">{seg.unit}</span>
        </div>
      ))}
    </div>
  );
}

export function TaskCard({ task }: { task: Task }) {
  const deadlineMs = new Date(task.deadline).getTime();
  const band = task.status === "completed" ? "calm" : urgencyBand(deadlineMs - Date.now());
  const style =
    task.status === "completed"
      ? "border-green-600 bg-green-950/20 text-green-100"
      : urgencyStyles[band];

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

      {task.status !== "completed" && <CountdownClock deadline={task.deadline} />}

      {band === "urgent" && task.status !== "completed" && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide">⚠ Due within 24 hours</p>
      )}
    </div>
  );
}
