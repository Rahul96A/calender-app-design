"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarSearchIcon,
  CheckIcon,
  EyeIcon,
  PencilIcon,
  SearchXIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatLong } from "@/lib/dates";
import { LEAVE_TYPES } from "@/lib/leave";
import { cn } from "@/lib/utils";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types";
import { useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay } from "@/stores/overlay-store";
import { StatusBadge } from "./status-badge";

export const ALL_STATUSES: LeaveStatus[] = ["approved", "pending", "declined", "cancelled"];

export type RequestFilters = { statuses: LeaveStatus[]; types: LeaveType[] };
export const DEFAULT_FILTERS: RequestFilters = { statuses: ALL_STATUSES, types: LEAVE_TYPES };

type SortKey = "status" | "type" | "days" | "from" | "to";
type Sort = { key: SortKey; dir: 1 | -1 } | null;

const COLUMNS: { key: SortKey | "notes"; label: string; width?: number }[] = [
  { key: "status", label: "Status", width: 112 },
  { key: "type", label: "Leave type", width: 120 },
  { key: "days", label: "Duration", width: 140 },
  { key: "from", label: "Date from", width: 140 },
  { key: "to", label: "Date to", width: 140 },
  { key: "notes", label: "Notes" },
];

function compare(a: LeaveRequest, b: LeaveRequest, key: SortKey) {
  if (key === "days") return a.days - b.days;
  return String(a[key]).localeCompare(String(b[key]));
}

export function RequestsTable({
  filters,
  onFiltersChange,
  ref,
}: {
  filters: RequestFilters;
  onFiltersChange: (f: RequestFilters) => void;
  ref?: React.Ref<HTMLElement>;
}) {
  const requests = useAppStore((s) => s.requests);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = requests.filter(
      (r) =>
        filters.statuses.includes(r.status) &&
        filters.types.includes(r.type) &&
        (!q ||
          [r.type, r.status, r.notes, r.duration, formatLong(r.from), formatLong(r.to)].some((v) =>
            v.toLowerCase().includes(q),
          )),
    );
    // Default order: most recently submitted first.
    const ordered = [...filtered].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return sort ? ordered.sort((a, b) => compare(a, b, sort.key) * sort.dir) : ordered;
  }, [requests, filters, query, sort]);

  const filtered = filters.statuses.length !== ALL_STATUSES.length || filters.types.length !== LEAVE_TYPES.length;

  const toggleSort = (key: SortKey) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  return (
    <section
      ref={ref}
      aria-label="Leave and requests"
      className="flex w-full shrink-0 scroll-mt-0 flex-col overflow-hidden border-t border-hairline bg-surface"
    >
      <div className="flex h-14 w-full shrink-0 items-center gap-2 overflow-hidden px-4">
        <h2 className="t-16 salt min-w-0 flex-1 text-heading">Leave and requests</h2>
        <div className="flex items-center gap-2">
          <label className="flex h-8 w-60 items-center gap-2 rounded-lg border border-control bg-surface px-2.5 transition-[border-color,box-shadow] duration-150 focus-within:border-brand/60 focus-within:ring-3 focus-within:ring-brand/15">
            <Icon name="search" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search requests"
              className="t-14 min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-2 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="press text-icon hover-fine:text-fg">
                <XIcon className="size-3.5" />
              </button>
            )}
          </label>
          <FilterPopover filters={filters} onChange={onFiltersChange} active={filtered} />
        </div>
      </div>

      <div role="table" aria-rowcount={rows.length} className="w-full">
        <div
          role="row"
          className="flex h-10 w-full items-center gap-4 overflow-hidden border-y border-hairline bg-app px-4"
        >
          {COLUMNS.map((c) =>
            c.key === "notes" ? (
              <div key={c.key} role="columnheader" className="t-14 min-w-0 flex-1 text-fg-2">
                {c.label}
              </div>
            ) : (
              <button
                key={c.key}
                type="button"
                role="columnheader"
                aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                onClick={() => toggleSort(c.key as SortKey)}
                className="t-14 group flex shrink-0 items-center gap-1 text-left text-fg-2 outline-none hover-fine:text-fg focus-visible:text-fg"
                style={{ width: c.width }}
              >
                {c.label}
                {sort?.key === c.key &&
                  (sort.dir === 1 ? <ArrowUpIcon className="size-3 text-fg" /> : <ArrowDownIcon className="size-3 text-fg" />)}
              </button>
            ),
          )}
          <div className="h-5 w-8 shrink-0" aria-hidden />
        </div>

        {rows.map((r) => (
          <RequestRow key={r.id} request={r} />
        ))}

        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <SearchXIcon className="size-5 text-icon" />
            <p className="t-14 text-fg">No requests match</p>
            <p className="t-12 text-fg-2">Try a different search or reset the filters.</p>
            <Button
              size="sm"
              className="mt-1"
              onClick={() => {
                setQuery("");
                onFiltersChange(DEFAULT_FILTERS);
              }}
            >
              Reset
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function RequestRow({ request: r }: { request: LeaveRequest }) {
  const router = useRouter();
  const today = useToday();
  const setStatus = useAppStore((s) => s.setRequestStatus);
  const deleteRequest = useAppStore((s) => s.deleteRequest);
  const canCancel = r.status === "pending" || (r.status === "approved" && r.from >= today);

  const showInCalendar = () => {
    useCalendarStore.getState().setDate(r.from);
    router.push("/time-off");
    document.querySelector("[data-page-scroll]")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      role="row"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button,[role=menuitem]")) return;
        openOverlay({ kind: "request-details", requestId: r.id });
      }}
      className="flex h-14 w-full cursor-pointer items-center gap-4 overflow-hidden border-b border-subtle px-4 transition-colors duration-150 hover-fine:bg-app/70"
    >
      <div role="cell" className="flex w-28 shrink-0 items-center overflow-hidden">
        <StatusBadge status={r.status} />
      </div>
      <div role="cell" className="t-14 w-[120px] shrink-0 truncate text-table">
        {r.type}
      </div>
      <div role="cell" className="t-14 w-[140px] shrink-0 truncate text-table">
        {r.duration}
      </div>
      <div role="cell" className="t-14 w-[140px] shrink-0 truncate text-table">
        {formatLong(r.from)}
      </div>
      <div role="cell" className="t-14 w-[140px] shrink-0 truncate text-table">
        {formatLong(r.to)}
      </div>
      <div role="cell" className="t-14 min-w-0 flex-1 truncate text-table">
        {r.notes}
      </div>
      <div role="cell" className="shrink-0">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-lg" aria-label={`Actions for ${r.notes}`} className="border-transparent">
                  <Icon name="more" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => openOverlay({ kind: "request-details", requestId: r.id })}>
              <EyeIcon /> View details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={showInCalendar}>
              <CalendarSearchIcon /> Show in calendar
            </DropdownMenuItem>
            {r.status === "pending" && (
              <DropdownMenuItem onSelect={() => openOverlay({ kind: "request", requestId: r.id })}>
                <PencilIcon /> Edit request
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem onSelect={() => setStatus(r.id, "cancelled")}>
                <XIcon /> Cancel request
              </DropdownMenuItem>
            )}
            {r.status === "pending" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="t-12 text-fg-2">Manager preview</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setStatus(r.id, "approved")}>
                  <CheckIcon /> Approve
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setStatus(r.id, "declined")}>
                  <XIcon /> Decline
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => deleteRequest(r.id)}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<LeaveStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  declined: "Declined",
  cancelled: "Cancelled",
};

function FilterPopover({
  filters,
  onChange,
  active,
}: {
  filters: RequestFilters;
  onChange: (f: RequestFilters) => void;
  active: boolean;
}) {
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button size="icon" aria-label="Filter requests" className="relative">
              <Icon name="filter" className={cn(active && "text-brand")} />
              {active && <span className="absolute top-[5px] right-[5px] size-1.5 rounded-full bg-brand ring-2 ring-surface" />}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Filter</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="w-60 gap-3 p-3">
        <fieldset className="grid gap-2">
          <legend className="t-12 mb-2 text-fg-2">Status</legend>
          {ALL_STATUSES.map((s) => (
            <label key={s} className="t-14 flex cursor-pointer items-center gap-2.5 text-fg">
              <Checkbox
                checked={filters.statuses.includes(s)}
                onCheckedChange={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })}
              />
              <StatusBadge status={s} />
              <span className="sr-only">{STATUS_LABEL[s]}</span>
            </label>
          ))}
        </fieldset>
        <div className="h-px bg-hairline" />
        <fieldset className="grid gap-2">
          <legend className="t-12 mb-2 text-fg-2">Leave type</legend>
          {LEAVE_TYPES.map((t) => (
            <label key={t} className="t-14 flex cursor-pointer items-center gap-2.5 text-fg">
              <Checkbox
                checked={filters.types.includes(t)}
                onCheckedChange={() => onChange({ ...filters, types: toggle(filters.types, t) })}
              />
              {t}
            </label>
          ))}
        </fieldset>
        <Button size="sm" disabled={!active} onClick={() => onChange(DEFAULT_FILTERS)} className="justify-center">
          Reset filters
        </Button>
      </PopoverContent>
    </Popover>
  );
}
