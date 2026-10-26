"use client";

import { useEffect, useState } from "react";
import { PlayIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { formatClock, formatHours } from "./shared";

/** Ticks once a second while the timer runs; `useNow()` only refreshes every 30s. */
function useElapsed(running: boolean, startedAt: number | null): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [running]);
  if (!running || !startedAt || !now) return 0;
  return Math.max(0, now - startedAt);
}

export function TimerCard({ projects, todayMinutes }: { projects: string[]; todayMinutes: number }) {
  const timer = useAppStore((s) => s.timer);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const updateTimer = useAppStore((s) => s.updateTimer);
  const elapsed = useElapsed(timer.running, timer.startedAt);

  const start = () => startTimer(timer.project.trim() || "General", timer.task.trim());

  return (
    <section
      aria-label="Timer"
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-surface p-3 transition-[border-color] duration-200 ease-(--ease-out)",
        timer.running ? "border-brand/40" : "border-hairline",
      )}
    >
      <form
        className="flex min-w-0 flex-1 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (timer.running) stopTimer();
          else start();
        }}
      >
        <Input
          aria-label="Project"
          placeholder="Project"
          list="tt-projects"
          className="h-[30px] w-52"
          value={timer.project}
          onChange={(e) => updateTimer({ project: e.target.value })}
        />
        <Input
          aria-label="Task"
          placeholder="What are you working on?"
          className="h-[30px] min-w-0 flex-1"
          value={timer.task}
          onChange={(e) => updateTimer({ task: e.target.value })}
        />
        <datalist id="tt-projects">
          {projects.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className="flex shrink-0 items-center gap-3 pl-2">
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={cn(
                "text-[22px] leading-none font-medium tracking-[-0.44px] tabular-nums",
                timer.running ? "text-fg" : "text-placeholder",
              )}
              role="timer"
              aria-live="off"
            >
              {formatClock(elapsed)}
            </span>
            <span className="t-12 flex items-center gap-1.5 text-fg-2">
              {timer.running ? (
                <>
                  <span className="size-1.5 animate-pulse rounded-full bg-danger" aria-hidden />
                  Recording
                </>
              ) : (
                <>Today · {formatHours(todayMinutes)}</>
              )}
            </span>
          </div>
          {timer.running ? (
            <Button type="submit" variant="destructive" className="w-[84px]">
              <SquareIcon className="fill-current" /> Stop
            </Button>
          ) : (
            <Button type="submit" variant="brand" className="w-[84px]">
              <PlayIcon className="fill-current" /> Start
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
