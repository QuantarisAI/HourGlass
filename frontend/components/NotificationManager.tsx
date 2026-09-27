"use client";

import { useEffect, useRef } from "react";
import { Task } from "@/lib/types";

const FIRED_KEY = "hourglass_fired_reminders";

function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveFired(fired: Set<string>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(Array.from(fired)));
  } catch {
    // ignore (private mode / storage disabled)
  }
}

/** Requests Notification permission once, then polls tasks and fires free
 * browser notifications at each task's configured reminder offsets. Only
 * fires while this tab is open — see README for a mobile push option. */
export function NotificationManager({ tasks }: { tasks: Task[] }) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    firedRef.current = loadFired();
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const interval = setInterval(() => {
      if (Notification.permission !== "granted") return;
      const now = Date.now();

      for (const task of tasks) {
        if (task.status === "completed") continue;
        const deadlineMs = new Date(task.deadline).getTime();
        const offsets = task.reminder_offsets_minutes
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n));

        for (const offsetMin of offsets) {
          const fireAt = deadlineMs - offsetMin * 60 * 1000;
          const key = `${task.id}:${offsetMin}`;
          if (now >= fireAt && now < deadlineMs && !firedRef.current.has(key)) {
            new Notification(`⏳ ${task.title}`, {
              body:
                offsetMin >= 60
                  ? `Due in ~${Math.round(offsetMin / 60)}h`
                  : `Due in ~${offsetMin} min`,
              tag: key,
            });
            firedRef.current.add(key);
            saveFired(firedRef.current);
          }
        }

        const overdueKey = `${task.id}:overdue`;
        if (now >= deadlineMs && !firedRef.current.has(overdueKey)) {
          new Notification(`⛔ Overdue: ${task.title}`, {
            body: "This deadline has passed.",
            tag: overdueKey,
          });
          firedRef.current.add(overdueKey);
          saveFired(firedRef.current);
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [tasks]);

  return null;
}
