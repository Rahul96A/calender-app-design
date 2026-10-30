"use client";

import { useEffect } from "react";
import { addDays, addMonths, startOfMonth } from "@/lib/dates";
import { useCalendarStore } from "@/stores/calendar-store";
import { useGoogleStore } from "@/stores/google-store";

const REFRESH_MS = 5 * 60_000;

/**
 * Keeps Google Calendar events loaded for the month around the calendar's
 * focused date, and refetches when the tab comes back into view.
 */
export function GoogleSync() {
  const status = useGoogleStore((s) => s.status);
  const date = useCalendarStore((s) => s.date);

  useEffect(() => {
    useGoogleStore.getState().restore();
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    // A week of slack on either side covers the month grid and week views at its edges.
    const from = addDays(startOfMonth(date), -7);
    const to = addDays(startOfMonth(addMonths(startOfMonth(date), 1)), 13);
    void useGoogleStore.getState().load(from, to);
  }, [status, date]);

  useEffect(() => {
    if (status !== "connected") return;
    const refresh = () => {
      if (document.visibilityState === "visible") void useGoogleStore.getState().refresh();
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [status]);

  return null;
}
