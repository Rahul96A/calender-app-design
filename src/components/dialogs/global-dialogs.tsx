"use client";

import { useState } from "react";
import { useOverlayStore, type Overlay } from "@/stores/overlay-store";
import { EventDialog } from "./event-dialog";
import { HolidaysDialog, PolicyDialog, ShortcutsDialog } from "./info-dialogs";
import { RequestDetailsDialog } from "./request-details-dialog";
import { RequestDialog } from "./request-dialog";

type Kind = Exclude<Overlay["kind"], "none" | "search">;
type Latest = { [K in Kind]?: Extract<Overlay, { kind: K }> };

/**
 * Hosts every app-wide dialog. The last payload of each kind is kept around so
 * a dialog keeps its content while it animates out after closing.
 */
export function GlobalDialogs() {
  const overlay = useOverlayStore((s) => s.overlay);
  const close = useOverlayStore((s) => s.close);
  const [latest, setLatest] = useState<Latest>({});
  const [session, setSession] = useState(0);
  const [prev, setPrev] = useState<Overlay>(overlay);

  // Derive state during render (no effect): remember payloads and count opens.
  if (overlay !== prev) {
    setPrev(overlay);
    if (overlay.kind !== "none" && overlay.kind !== "search") {
      setLatest((l) => ({ ...l, [overlay.kind]: overlay }));
      setSession((n) => n + 1);
    }
  }

  const is = (k: Kind) => overlay.kind === k;

  return (
    <>
      <RequestDialog
        open={is("request")}
        session={session}
        onClose={close}
        requestId={latest.request?.requestId}
        from={latest.request?.from}
      />
      <EventDialog
        open={is("event")}
        session={session}
        onClose={close}
        eventId={latest.event?.eventId}
        date={latest.event?.date}
        start={latest.event?.start}
        end={latest.event?.end}
        allDay={latest.event?.allDay}
      />
      <RequestDetailsDialog
        open={is("request-details")}
        onClose={close}
        requestId={latest["request-details"]?.requestId}
      />
      <HolidaysDialog open={is("holidays")} onClose={close} />
      <PolicyDialog open={is("policy")} onClose={close} />
      <ShortcutsDialog open={is("shortcuts")} onClose={close} />
    </>
  );
}
