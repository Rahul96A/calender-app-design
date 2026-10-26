"use client";

import { useMemo } from "react";
import { isWeekend, weekDays } from "@/lib/dates";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { CalendarHeader } from "./calendar-header";
import { EventPopover } from "./event-popover";
import { MonthView } from "./month-view";
import { TimeGrid } from "./time-grid";

export function Calendar() {
  const view = useCalendarStore((s) => s.view);
  const date = useCalendarStore((s) => s.date);
  const weekStartsOn = useAppStore((s) => s.settings.weekStartsOn);
  const showWeekends = useAppStore((s) => s.settings.showWeekends);

  const days = useMemo(() => {
    if (view === "day") return [date];
    const week = weekDays(date, weekStartsOn);
    return showWeekends ? week : week.filter((d) => !isWeekend(d));
  }, [view, date, weekStartsOn, showWeekends]);

  return (
    <section aria-label="Calendar" className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-surface">
      <CalendarHeader />
      {view === "month" ? <MonthView /> : <TimeGrid key={view} days={days} />}
      <EventPopover />
    </section>
  );
}
