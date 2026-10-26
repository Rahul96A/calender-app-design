"use client";

import { useEffect, useMemo } from "react";
import { isWeekend, weekDays } from "@/lib/dates";
import { useIsMobile } from "@/hooks/use-media-query";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { CalendarHeader } from "./calendar-header";
import { EventPopover } from "./event-popover";
import { MonthView } from "./month-view";
import { TimeGrid } from "./time-grid";

// Phones open on the day view once per session (a 7-column week is cramped
// there); after that the user's choice sticks.
let mobileViewApplied = false;

export function Calendar() {
  const view = useCalendarStore((s) => s.view);
  const date = useCalendarStore((s) => s.date);
  const weekStartsOn = useAppStore((s) => s.settings.weekStartsOn);
  const showWeekends = useAppStore((s) => s.settings.showWeekends);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile || mobileViewApplied) return;
    mobileViewApplied = true;
    if (useCalendarStore.getState().view === "week") useCalendarStore.getState().setView("day");
  }, [isMobile]);

  const week = useMemo(() => {
    const all = weekDays(date, weekStartsOn);
    return showWeekends ? all : all.filter((d) => !isWeekend(d));
  }, [date, weekStartsOn, showWeekends]);

  const days = view === "day" ? [date] : week;

  return (
    <section
      aria-label="Calendar"
      className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-surface [--axis:44px] md:[--axis:70px]"
    >
      <CalendarHeader />
      {view === "month" ? <MonthView /> : <TimeGrid key={view} days={days} strip={view === "day" ? week : undefined} />}
      <EventPopover />
    </section>
  );
}
