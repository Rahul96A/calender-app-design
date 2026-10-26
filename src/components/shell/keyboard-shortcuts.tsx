"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToday } from "@/hooks/use-today";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay, useOverlayStore } from "@/stores/overlay-store";

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Search" },
  { keys: ["N"], label: "New event" },
  { keys: ["R"], label: "Request time-off" },
  { keys: ["T"], label: "Go to today" },
  { keys: ["←"], label: "Previous period" },
  { keys: ["→"], label: "Next period" },
  { keys: ["D"], label: "Day view" },
  { keys: ["W"], label: "Week view" },
  { keys: ["M"], label: "Month view" },
  { keys: ["?"], label: "Show shortcuts" },
];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Single-key shortcuts. These act instantly — keyboard actions never animate. */
export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const today = useToday();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (useOverlayStore.getState().overlay.kind !== "none") return;
      if (document.querySelector("[role=dialog],[role=menu],[data-radix-popper-content-wrapper]")) return;

      const cal = useCalendarStore.getState();
      const onCalendar = pathname === "/time-off";
      const key = e.key;

      if (key === "?") openOverlay({ kind: "shortcuts" });
      else if (key === "n" || key === "N") openOverlay({ kind: "event", date: cal.date });
      else if (key === "r" || key === "R") openOverlay({ kind: "request" });
      else if (key === "t" || key === "T") {
        cal.setDate(today);
        if (!onCalendar) router.push("/time-off");
      } else if (onCalendar && key === "ArrowLeft") cal.step(-1);
      else if (onCalendar && key === "ArrowRight") cal.step(1);
      else if (onCalendar && (key === "d" || key === "D")) cal.setView("day");
      else if (onCalendar && (key === "w" || key === "W")) cal.setView("week");
      else if (onCalendar && (key === "m" || key === "M")) cal.setView("month");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router, today]);

  return null;
}
