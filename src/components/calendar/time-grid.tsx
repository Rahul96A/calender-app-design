"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WEEKDAYS_SHORT, dayOfWeek, formatTime, formatTimeRange, fromKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CalEvent } from "@/lib/types";
import { useNow, useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay } from "@/stores/overlay-store";
import { AllDayRow } from "./all-day-row";
import { eventStyle } from "./event-colors";
import { TwoLineTitle } from "./two-line-title";
import {
  clamp,
  HOUR_HEIGHT,
  layoutDay,
  MIN_EVENT_MINUTES,
  minutesToPx,
  pxToMinutes,
  snap,
  SNAP_MINUTES,
} from "./layout";

const AXIS_WIDTH = 70;
const HOURS = Array.from({ length: 23 }, (_, i) => i + 1);
const DRAG_THRESHOLD = 4;

type Drag =
  | { type: "create"; dayIndex: number; anchor: number; current: number; moved: boolean }
  | {
      type: "move" | "resize";
      eventId: string;
      dayIndex: number;
      start: number;
      end: number;
      grabOffset: number;
      moved: boolean;
      locked: boolean;
    };

export function DayHeaders({ days }: { days: string[] }) {
  const selected = useCalendarStore((s) => s.date);
  const setDate = useCalendarStore((s) => s.setDate);
  const setView = useCalendarStore((s) => s.setView);
  const today = useToday();

  return (
    <div className="flex h-14 w-full shrink-0 items-start overflow-hidden border-b border-hairline">
      <div className="h-full shrink-0" style={{ width: AXIS_WIDTH }} />
      {days.map((d) => {
        const isSelected = d === selected;
        const isToday = d === today;
        return (
          <button
            key={d}
            type="button"
            onClick={() => (isSelected ? setView("day") : setDate(d))}
            aria-label={`${fromKey(d).toDateString()}${isSelected ? ", selected — open day view" : ""}`}
            aria-pressed={isSelected}
            className="group flex h-full min-w-0 flex-1 items-center gap-2 overflow-hidden border-l border-hairline px-3 text-left outline-none focus-visible:bg-hover"
          >
            <span className="t-14 shrink-0 text-center whitespace-nowrap text-dayname">{WEEKDAYS_SHORT[dayOfWeek(d)]}</span>
            <span
              className={cn(
                "t-16 flex h-6 min-w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg px-1 whitespace-nowrap transition-[background-color,color] duration-150",
                isSelected
                  ? "accent-badge font-semibold"
                  : isToday
                    ? "text-brand group-hover:bg-brand-tint"
                    : "text-fg group-hover:bg-hover",
              )}
            >
              {fromKey(d).getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TimeGrid({ days }: { days: string[] }) {
  const events = useAppStore((s) => s.events);
  const timeFormat = useAppStore((s) => s.settings.timeFormat);
  const dayStartHour = useAppStore((s) => s.settings.dayStartHour);
  const moveEvent = useAppStore((s) => s.moveEvent);
  const focusEventId = useCalendarStore((s) => s.focusEventId);
  const clearFocus = useCalendarStore((s) => s.clearFocus);
  const openPopover = useCalendarStore((s) => s.openPopover);
  const today = useToday();
  const now = useNow();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number; target: Element | null } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Open on the working day, like the design (06:00 at the top edge).
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = dayStartHour * HOUR_HEIGHT;
  }, [dayStartHour]);

  // Scroll a searched-for event into view and pulse it once.
  useEffect(() => {
    if (!focusEventId) return;
    const ev = events.find((e) => e.id === focusEventId);
    if (ev && !ev.allDay && scrollRef.current) {
      scrollRef.current.scrollTo({ top: Math.max(0, minutesToPx(ev.start) - HOUR_HEIGHT), behavior: "smooth" });
    }
    const raf = requestAnimationFrame(() => {
      setHighlightId(focusEventId);
      clearFocus();
    });
    const t = setTimeout(() => setHighlightId(null), 1400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [focusEventId, events, clearFocus]);

  // Apply the in-flight drag as a preview so the layout reflows live.
  const columns = useMemo(() => {
    const preview =
      drag && drag.type !== "create" && drag.moved && !drag.locked
        ? { id: drag.eventId, date: days[drag.dayIndex], start: drag.start, end: drag.end }
        : null;
    return days.map((day) => {
      const dayEvents = events
        .map((e) => (preview && e.id === preview.id ? { ...e, ...preview } : e))
        .filter((e) => !e.allDay && e.date === day);
      return layoutDay(dayEvents);
    });
  }, [days, events, drag]);

  function pointToSlot(clientX: number, clientY: number) {
    const rect = bodyRef.current!.getBoundingClientRect();
    const colWidth = rect.width / days.length;
    return {
      dayIndex: clamp(Math.floor((clientX - rect.left) / colWidth), 0, days.length - 1),
      minutes: clamp(pxToMinutes(clientY - rect.top), 0, 1440),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as Element;
    const eventEl = target.closest<HTMLElement>("[data-event-id]");
    const { dayIndex, minutes } = pointToSlot(e.clientX, e.clientY);
    pointerStart.current = { x: e.clientX, y: e.clientY, target: eventEl };
    e.currentTarget.setPointerCapture(e.pointerId);

    if (eventEl) {
      const ev = events.find((x) => x.id === eventEl.dataset.eventId);
      if (!ev) return;
      const resizing = Boolean(target.closest("[data-resize]"));
      setDrag({
        type: resizing ? "resize" : "move",
        eventId: ev.id,
        dayIndex: days.indexOf(ev.date),
        start: ev.start,
        end: ev.end,
        grabOffset: minutes - ev.start,
        moved: false,
        locked: Boolean(ev.requestId),
      });
    } else {
      const m = snap(minutes - SNAP_MINUTES / 2);
      setDrag({ type: "create", dayIndex, anchor: m, current: m, moved: false });
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag || !pointerStart.current) return;
    const dist = Math.hypot(e.clientX - pointerStart.current.x, e.clientY - pointerStart.current.y);
    const moved = drag.moved || dist > DRAG_THRESHOLD;
    if (!moved) return;
    const { dayIndex, minutes } = pointToSlot(e.clientX, e.clientY);

    if (drag.type === "create") {
      setDrag({ ...drag, moved, current: snap(minutes) });
    } else if (drag.locked) {
      setDrag({ ...drag, moved });
    } else if (drag.type === "move") {
      const length = drag.end - drag.start;
      const start = clamp(snap(minutes - drag.grabOffset), 0, 1440 - length);
      setDrag({ ...drag, moved, dayIndex, start, end: start + length });
    } else {
      const end = clamp(snap(minutes), drag.start + MIN_EVENT_MINUTES, 1440);
      setDrag({ ...drag, moved, end });
    }
  }

  function onPointerUp() {
    const d = drag;
    const start = pointerStart.current;
    setDrag(null);
    pointerStart.current = null;
    if (!d) return;

    if (d.type === "create") {
      const day = days[d.dayIndex];
      if (!d.moved) {
        const s = clamp(Math.floor(d.anchor / 30) * 30, 0, 1380);
        openOverlay({ kind: "event", date: day, start: s, end: s + 60 });
      } else {
        const s = Math.min(d.anchor, d.current);
        const en = Math.max(d.anchor, d.current, s + MIN_EVENT_MINUTES);
        openOverlay({ kind: "event", date: day, start: s, end: en });
      }
      return;
    }
    if (!d.moved || d.locked) {
      if (start?.target) openPopover("event", d.eventId, start.target);
      return;
    }
    const ev = events.find((x) => x.id === d.eventId);
    const date = days[d.dayIndex];
    if (ev && (ev.date !== date || ev.start !== d.start || ev.end !== d.end)) {
      moveEvent(d.eventId, { date, start: d.start, end: d.end });
    }
  }

  const nowMinutes = now ? (now - fromKey(today).getTime()) / 60000 : -1;
  const todayIndex = days.indexOf(today);
  const createGhost =
    drag?.type === "create"
      ? {
          dayIndex: drag.dayIndex,
          start: drag.moved ? Math.min(drag.anchor, drag.current) : clamp(Math.floor(drag.anchor / 30) * 30, 0, 1380),
          end: drag.moved
            ? Math.max(drag.anchor, drag.current, Math.min(drag.anchor, drag.current) + MIN_EVENT_MINUTES)
            : clamp(Math.floor(drag.anchor / 30) * 30, 0, 1380) + 60,
        }
      : null;

  return (
    <>
      <DayHeaders days={days} />
      <AllDayRow days={days} axisWidth={AXIS_WIDTH} />
      <div
        ref={scrollRef}
        onScroll={() => useCalendarStore.getState().popover && useCalendarStore.getState().closePopover()}
        className="relative min-h-0 w-full flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Masks the line/label that sits exactly on the top edge when scrolled to an hour. */}
        <div className="pointer-events-none sticky top-0 z-20 h-0 w-full" aria-hidden>
          <div className="absolute top-0 left-0 h-2 bg-surface" style={{ width: AXIS_WIDTH }} />
          <div className="absolute top-0 right-0 h-px bg-surface" style={{ left: AXIS_WIDTH }} />
        </div>
        <div className="relative flex w-full" style={{ height: 24 * HOUR_HEIGHT }}>

          {/* Hour lines */}
          <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: AXIS_WIDTH }} aria-hidden>
            {HOURS.map((h) => (
              <div key={h} className="absolute inset-x-0 h-px bg-hairline" style={{ top: h * HOUR_HEIGHT }} />
            ))}
          </div>

          {/* Time axis */}
          <div className="relative h-full shrink-0 select-none" style={{ width: AXIS_WIDTH }} aria-hidden>
            {HOURS.map((h) => (
              <span
                key={h}
                className="t-14 absolute right-3 whitespace-nowrap text-fg-2"
                style={{ top: h * HOUR_HEIGHT - 7 }}
              >
                {formatTime(h * 60, timeFormat).replace(":00 ", " ")}
              </span>
            ))}
          </div>

          {/* Day columns */}
          <div
            ref={bodyRef}
            className={cn("relative flex h-full min-w-0 flex-1 touch-none select-none", drag?.moved && drag.type === "move" && !drag.locked && "cursor-grabbing")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
          >
            {days.map((day, i) => (
              <div
                key={day}
                className="relative h-full min-w-0 flex-1 border-l border-hairline"
                aria-label={`${fromKey(day).toDateString()} schedule`}
                role="group"
              >
                {columns[i].map(({ event, column, columns: count }) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    column={column}
                    count={count}
                    timeFormat={timeFormat}
                    dragging={Boolean(drag && drag.type !== "create" && drag.eventId === event.id && drag.moved && !drag.locked)}
                    highlighted={highlightId === event.id}
                    onOpen={(el) => openPopover("event", event.id, el)}
                  />
                ))}

                {createGhost?.dayIndex === i && (
                  <div
                    className="pointer-events-none absolute z-20 flex flex-col gap-0.5 overflow-hidden rounded-lg border border-dashed border-brand/60 bg-brand-tint p-2 text-brand"
                    style={{
                      top: minutesToPx(createGhost.start) + 1,
                      height: Math.max(minutesToPx(createGhost.end - createGhost.start) - 2, 14),
                      left: 2,
                      right: 3,
                    }}
                  >
                    <span className="t-12 salt">{formatTimeRange(createGhost.start, createGhost.end, timeFormat)}</span>
                  </div>
                )}

                {i === todayIndex && nowMinutes >= 0 && nowMinutes <= 1440 && (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                    style={{ top: minutesToPx(nowMinutes) - 4 }}
                    aria-label={`Now, ${formatTime(Math.floor(nowMinutes), timeFormat)}`}
                  >
                    <span className="-ml-1 size-2 rounded-full bg-brand" />
                    <span className="h-[1.5px] flex-1 bg-brand" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function EventBlock({
  event,
  column,
  count,
  timeFormat,
  dragging,
  highlighted,
  onOpen,
}: {
  event: CalEvent;
  column: number;
  count: number;
  timeFormat: "24h" | "12h";
  dragging: boolean;
  highlighted: boolean;
  onOpen: (el: HTMLElement) => void;
}) {
  const height = minutesToPx(event.end - event.start) - 2;
  const compact = height < 44;
  const locked = Boolean(event.requestId);
  const time = formatTimeRange(event.start, event.end, timeFormat);

  return (
    <div
      data-event-id={event.id}
      role="button"
      tabIndex={0}
      aria-label={`${event.title}, ${time}${event.note ? `, ${event.note}` : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(e.currentTarget);
        }
      }}
      className={cn(
        "group/event absolute flex overflow-hidden rounded-lg font-medium outline-none",
        "transition-[box-shadow,filter,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-brand/60",
        "hover-fine:brightness-[0.97] dark:hover-fine:brightness-110",
        compact ? "items-center px-2" : "flex-col gap-0.5 p-2",
        locked ? "cursor-pointer" : "cursor-grab",
        dragging && "z-30 opacity-95 shadow-[0_8px_24px_-6px_rgba(15,15,15,0.28)]",
        highlighted && "animate-[event-pulse_1.4s_var(--ease-out)]",
      )}
      style={{
        ...eventStyle(event.color),
        top: minutesToPx(event.start) + 1,
        height: Math.max(height, 14),
        left: `calc((100% - 5px) * ${column / count} + 2px)`,
        width: `calc((100% - 5px) / ${count} - ${count > 1 ? 2 : 0}px)`,
        zIndex: dragging ? 30 : 10 + column,
      }}
    >
      {compact ? (
        <p className="t-14 salt min-w-0 flex-1 truncate">
          {event.title}
          {height >= 28 ? null : <span className="t-12 ml-1 opacity-80">{formatTime(event.start, timeFormat)}</span>}
        </p>
      ) : (
        <>
          {height >= 60 ? (
            <TwoLineTitle text={event.title} className="t-14 salt w-full shrink-0 overflow-hidden" />
          ) : (
            <p className="t-14 salt w-full shrink-0 truncate">{event.title}</p>
          )}
          <p className="t-12 salt w-full shrink-0 truncate">{time}</p>
          {event.note && <p className="t-12 salt w-full shrink-0 truncate">{event.note}</p>}
        </>
      )}
      {!locked && (
        <span
          data-resize
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
        />
      )}
    </div>
  );
}
