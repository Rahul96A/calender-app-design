"use client";

import { useMemo } from "react";
import { WEEKDAYS_SHORT, dayOfWeek, formatTime, fromKey, isWeekend, monthGrid } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay } from "@/stores/overlay-store";
import { eventStyle } from "./event-colors";

const MAX_CHIPS = 3;

export function MonthView() {
  const date = useCalendarStore((s) => s.date);
  const setDate = useCalendarStore((s) => s.setDate);
  const setView = useCalendarStore((s) => s.setView);
  const openPopover = useCalendarStore((s) => s.openPopover);
  const events = useAppStore((s) => s.events);
  const holidays = useAppStore((s) => s.holidays);
  const { weekStartsOn, showWeekends, timeFormat } = useAppStore((s) => s.settings);
  const today = useToday();

  const grid = useMemo(() => {
    const all = monthGrid(date, weekStartsOn);
    return showWeekends ? all : all.filter((d) => !isWeekend(d));
  }, [date, weekStartsOn, showWeekends]);
  const cols = showWeekends ? 7 : 5;
  const month = date.slice(0, 7);

  const byDay = useMemo(() => {
    const map = new Map<string, { kind: "event" | "holiday"; id: string; label: string; color: Parameters<typeof eventStyle>[0]; sort: number }[]>();
    for (const h of holidays) {
      map.set(h.date, [...(map.get(h.date) ?? []), { kind: "holiday", id: h.id, label: "National holiday", color: "purple", sort: -2 }]);
    }
    for (const e of events) {
      const label = e.allDay ? e.title : `${formatTime(e.start, timeFormat)} ${e.title}`;
      map.set(e.date, [...(map.get(e.date) ?? []), { kind: "event", id: e.id, label, color: e.color, sort: e.allDay ? -1 : e.start }]);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort - b.sort);
    return map;
  }, [events, holidays, timeFormat]);

  const headers = grid.slice(0, cols).map((d) => WEEKDAYS_SHORT[dayOfWeek(d)]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid h-10 shrink-0 border-b border-hairline" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {headers.map((h, i) => (
          <div key={h} className={cn("t-14 flex items-center px-3 text-dayname", i > 0 && "border-l border-hairline")}>
            {h}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(6, minmax(0, 1fr))` }}
      >
        {grid.map((d, i) => {
          const items = byDay.get(d) ?? [];
          const inMonth = d.startsWith(month);
          const selected = d === date;
          const isToday = d === today;
          const hidden = items.length - MAX_CHIPS;
          return (
            <div
              key={d}
              onClick={(e) => {
                if (e.target === e.currentTarget) setDate(d);
              }}
              onDoubleClick={(e) => {
                if (e.target === e.currentTarget) openOverlay({ kind: "event", date: d, start: 540, end: 600 });
              }}
              className={cn(
                "flex min-h-0 flex-col gap-1 overflow-hidden border-b border-hairline p-1.5",
                i % cols > 0 && "border-l",
                !inMonth && "bg-app/60",
              )}
            >
              <button
                type="button"
                onClick={() => (selected ? setView("day") : setDate(d))}
                className={cn(
                  "t-14 flex h-6 min-w-6 shrink-0 items-center justify-center self-start rounded-lg px-1 transition-[background-color,color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                  selected
                    ? "accent-badge font-semibold"
                    : isToday
                      ? "text-brand hover-fine:bg-brand-tint"
                      : inMonth
                        ? "text-fg hover-fine:bg-hover"
                        : "text-placeholder hover-fine:bg-hover",
                )}
                aria-label={fromKey(d).toDateString()}
              >
                {fromKey(d).getDate()}
              </button>
              {items.slice(0, MAX_CHIPS).map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={(e) => openPopover(it.kind, it.id, e.currentTarget)}
                  className={cn(
                    "t-12 salt flex h-[22px] w-full shrink-0 items-center truncate rounded-md px-1.5 text-left outline-none",
                    "hover-fine:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-brand/50 dark:hover-fine:brightness-110",
                    !inMonth && "opacity-60",
                  )}
                  style={eventStyle(it.color)}
                >
                  <span className="truncate">{it.label}</span>
                </button>
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDate(d);
                    setView("day");
                  }}
                  className="t-12 self-start rounded-md px-1.5 py-1 text-fg-2 hover-fine:bg-hover hover-fine:text-fg"
                >
                  +{hidden} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
