"use client";

import { create } from "zustand";
import { addDays, addMonths } from "@/lib/dates";
import { DESIGN_DATE } from "@/lib/seed";

export type CalendarView = "day" | "week" | "month";

type CalendarStore = {
  view: CalendarView;
  /** Focused day: drives the visible range and the accent date badge. */
  date: string;
  /** Asks the grid to scroll a specific event into view. */
  focusEventId: string | null;
  setView: (view: CalendarView) => void;
  setDate: (date: string) => void;
  step: (dir: 1 | -1) => void;
  focusEvent: (id: string, date: string) => void;
  clearFocus: () => void;
};

export const useCalendarStore = create<CalendarStore>()((set, get) => ({
  view: "week",
  date: DESIGN_DATE,
  focusEventId: null,
  setView: (view) => set({ view }),
  setDate: (date) => set({ date }),
  step: (dir) => {
    const { view, date } = get();
    if (view === "day") set({ date: addDays(date, dir) });
    else if (view === "week") set({ date: addDays(date, 7 * dir) });
    else set({ date: addMonths(date, dir) });
  },
  focusEvent: (id, date) => set({ focusEventId: id, date }),
  clearFocus: () => set({ focusEventId: null }),
}));
