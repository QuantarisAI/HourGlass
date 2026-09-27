"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatDock } from "@/components/ChatDock";
import { NotificationManager } from "@/components/NotificationManager";
import { TaskCard } from "@/components/TaskCard";
import { fetchTasks } from "@/lib/api";
import { Task } from "@/lib/types";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchTasks()
      .then((data) => {
        setTasks([...data].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
        setError(null);
      })
      .catch(() => setError("Can't reach the backend. Is it running on NEXT_PUBLIC_API_BASE?"));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const active = tasks.filter((t) => t.status !== "completed");
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <main className="mx-auto flex h-screen max-w-7xl flex-col gap-4 p-4 md:flex-row">
      <NotificationManager tasks={tasks} />

      <section className="flex-1 overflow-y-auto">
        <h1 className="mb-4 text-2xl font-bold">HourGlass</h1>

        {error && (
          <p className="mb-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {active.length === 0 && !error && (
          <p className="text-slate-400">
            No tasks yet — tell the assistant what to track, e.g. &quot;Add Kaggle Sprint due 30
            September 6pm&quot;.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>

        {completed.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-lg font-semibold text-slate-400">Completed</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {completed.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="h-[70vh] w-full shrink-0 md:h-full md:w-96">
        <ChatDock onTaskChange={refresh} />
      </aside>
    </main>
  );
}
