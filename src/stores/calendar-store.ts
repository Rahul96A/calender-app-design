"use client";

import { create } from "zustand";
import { addDays, addMonths } from "@/lib/dates";
import { DESIGN_DATE } from "@/lib/seed";

export type CalendarView = "day" | "week" | "month";

/** What the details popover is showing and where it's anchored. */
export type PopoverTarget = {
  kind: "event" | "holiday";
  id: string;
  rect: { x: number; y: number; width: number; height: number };
};

type CalendarStore = {
  view: CalendarView;
  /** Focused day: drives the visible range and the accent date badge. */
  date: string;
  /** Asks the grid to scroll a specific event into view. */
  focusEventId: string | null;
  popover: PopoverTarget | null;
  setView: (view: CalendarView) => void;
  setDate: (date: string) => void;
  step: (dir: 1 | -1) => void;
  focusEvent: (id: string, date: string) => void;
  clearFocus: () => void;
  openPopover: (kind: PopoverTarget["kind"], id: string, el: Element) => void;
  closePopover: () => void;
};

export const useCalendarStore = create<CalendarStore>()((set, get) => ({
  view: "week",
  date: DESIGN_DATE,
  focusEventId: null,
  popover: null,
  setView: (view) => set({ view, popover: null }),
  setDate: (date) => set({ date, popover: null }),
  step: (dir) => {
    const { view, date } = get();
    const next = view === "day" ? addDays(date, dir) : view === "week" ? addDays(date, 7 * dir) : addMonths(date, dir);
    set({ date: next, popover: null });
  },
  focusEvent: (id, date) => set({ focusEventId: id, date }),
  clearFocus: () => set({ focusEventId: null }),
  openPopover: (kind, id, el) => {
    const r = el.getBoundingClientRect();
    set({ popover: { kind, id, rect: { x: r.x, y: r.y, width: r.width, height: r.height } } });
  },
  closePopover: () => set({ popover: null }),
}));
