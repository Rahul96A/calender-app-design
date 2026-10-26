"use client";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  addDays,
  formatRange,
  formatShort,
  formatWeekday,
  fromKey,
  isoWeek,
  monthName,
  startOfMonth,
  daysInMonth,
  weekDays,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore, type CalendarView } from "@/stores/calendar-store";

// Fixed segment geometry from the Figma so the active pill can slide.
const VIEWS: { id: CalendarView; label: string; left: number; width: number; key: string }[] = [
  { id: "day", label: "Day", left: 1, width: 45, key: "D" },
  { id: "week", label: "Week", left: 48, width: 51, key: "W" },
  { id: "month", label: "Month", left: 101, width: 61, key: "M" },
];

function useRangeLabel() {
  const { view, date } = useCalendarStore();
  const weekStartsOn = useAppStore((s) => s.settings.weekStartsOn);
  const year = fromKey(date).getFullYear();
  const title = `${monthName(date)}, ${year}`;

  if (view === "month") {
    const first = startOfMonth(date);
    return { title, subtitle: formatRange(first, addDays(first, daysInMonth(date) - 1)) };
  }
  const days = weekDays(date, weekStartsOn);
  // ISO weeks start on Monday; for Sunday-first weeks use that Monday.
  const week = isoWeek(weekStartsOn === 0 ? days[1] : days[0]);
  if (view === "day") return { title, subtitle: `Week ${isoWeek(date)} · ${formatWeekday(date)}, ${formatShort(date)}` };
  return { title, subtitle: `Week ${week} · ${formatRange(days[0], days[6])}` };
}

export function CalendarHeader() {
  const view = useCalendarStore((s) => s.view);
  const setView = useCalendarStore((s) => s.setView);
  const setDate = useCalendarStore((s) => s.setDate);
  const step = useCalendarStore((s) => s.step);
  const today = useToday();
  const { title, subtitle } = useRangeLabel();
  const active = VIEWS.find((v) => v.id === view)!;
  const unit = view === "day" ? "day" : view === "week" ? "week" : "month";

  return (
    <div className="flex h-[68px] w-full shrink-0 items-center gap-2 overflow-hidden border-b border-hairline px-4">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 overflow-hidden whitespace-nowrap">
        <h2 className="t-16 text-fg">{title}</h2>
        <p className="t-14 salt text-fg-2">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setDate(today)} aria-keyshortcuts="T">
          Today
        </Button>

        <div className="flex h-[30px] items-center overflow-hidden rounded-lg border border-control bg-surface">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={`Previous ${unit}`}
                className="press flex h-full w-[29px] items-center justify-center outline-none hover-fine:bg-hover focus-visible:bg-hover"
              >
                <Icon name="arrow-left" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Previous {unit}</TooltipContent>
          </Tooltip>
          <span className="h-full w-px bg-control" aria-hidden />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={`Next ${unit}`}
                className="press flex h-full w-[29px] items-center justify-center outline-none hover-fine:bg-hover focus-visible:bg-hover"
              >
                <Icon name="arrow-right" className="-scale-x-100" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Next {unit}</TooltipContent>
          </Tooltip>
        </div>

        <div role="tablist" aria-label="Calendar view" className="relative flex h-[30px] w-[163px] items-center gap-0.5 overflow-hidden rounded-lg bg-app p-px">
          <span
            aria-hidden
            className="absolute top-px left-0 h-7 rounded-lg border border-segment bg-surface transition-[transform,width] duration-200 ease-(--ease-out)"
            style={{ width: active.width, transform: `translateX(${active.left}px)` }}
          />
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              aria-keyshortcuts={v.key}
              onClick={() => setView(v.id)}
              style={{ width: v.width }}
              className={cn(
                "t-14 salt relative z-10 flex h-7 shrink-0 items-center justify-center rounded-md outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/40",
                view === v.id ? "text-fg" : "text-fg-2 hover-fine:text-fg",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
