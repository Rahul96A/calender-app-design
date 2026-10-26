"use client";

import { useRef, useState } from "react";
import { Calendar } from "@/components/calendar/calendar";
import { DEFAULT_FILTERS, RequestsTable, type RequestFilters } from "./requests-table";
import { StatsPanel } from "./stats-panel";

/** Height of the "Leave and requests" block as drawn in the design (toolbar + header + 4 rows). */
const REQUESTS_PEEK = 321;

export function TimeOffView() {
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_FILTERS);
  const tableRef = useRef<HTMLElement>(null);

  return (
    <div data-page-scroll className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div
        className="flex w-full shrink-0 overflow-hidden"
        style={{ height: `max(520px, calc(100% - ${REQUESTS_PEEK}px))` }}
      >
        <Calendar />
        <StatsPanel
          onShowPending={() => {
            setFilters({ ...DEFAULT_FILTERS, statuses: ["pending"] });
            tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </div>
      <RequestsTable ref={tableRef} filters={filters} onFiltersChange={setFilters} />
    </div>
  );
}
