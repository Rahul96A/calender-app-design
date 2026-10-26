"use client";

import { useMemo, useState } from "react";
import { ClockIcon, PencilIcon, PlayIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { addDays, formatRange, formatShort, formatWeekday, isoWeek, startOfWeek } from "@/lib/dates";
import type { TimeEntry } from "@/lib/types";
import { useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { EntryDialog } from "./entry-dialog";
import { BILLABLE_COLOR, formatHours, NON_BILLABLE_COLOR, projectColor, sumMinutes } from "./shared";
import { TimerCard } from "./timer-card";
import { ChartLegend, WeekChart, type DayTotal } from "./week-chart";

type DialogState = { open: boolean; session: number; entry?: TimeEntry };

export function TimeTrackingPage() {
  const today = useToday();
  const weekStartsOn = useAppStore((s) => s.settings.weekStartsOn);
  const entries = useAppStore((s) => s.timeEntries);
  const timerRunning = useAppStore((s) => s.timer.running);
  const startTimer = useAppStore((s) => s.startTimer);
  const saveTimeEntry = useAppStore((s) => s.saveTimeEntry);
  const deleteTimeEntry = useAppStore((s) => s.deleteTimeEntry);

  // Weeks relative to the current one, so the view follows `today` and `weekStartsOn`.
  const [offset, setOffset] = useState(0);
  const [dialog, setDialog] = useState<DialogState>({ open: false, session: 0 });

  const weekStart = addDays(startOfWeek(today, weekStartsOn), offset * 7);
  const weekEnd = addDays(weekStart, 6);
  const isCurrentWeek = offset === 0;

  const projects = useMemo(() => [...new Set(entries.map((e) => e.project))].sort(), [entries]);

  const weekEntries = useMemo(
    () => entries.filter((e) => e.date >= weekStart && e.date <= weekEnd),
    [entries, weekStart, weekEnd],
  );

  const days: DayTotal[] = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const t = sumMinutes(weekEntries.filter((e) => e.date === date));
        return { date, billable: t.billable, nonBillable: t.nonBillable };
      }),
    [weekStart, weekEntries],
  );

  const groups = useMemo(() => {
    const byDay = new Map<string, TimeEntry[]>();
    for (const e of weekEntries) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [weekEntries]);

  const totals = sumMinutes(weekEntries);
  const todayMinutes = useMemo(
    () => entries.reduce((n, e) => (e.date === today ? n + e.minutes : n), 0),
    [entries, today],
  );
  const billablePct = totals.total ? Math.round((totals.billable / totals.total) * 100) : 0;

  const openDialog = (entry?: TimeEntry) => setDialog((d) => ({ open: true, session: d.session + 1, entry }));
  const scrollToDay = (date: string) =>
    document.getElementById(`tt-day-${date}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-thin bg-app">
      <header className="sticky top-0 z-10 flex h-[68px] shrink-0 items-center gap-3 border-b border-hairline bg-surface px-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="t-16 text-fg">{isCurrentWeek ? "This week" : `Week ${isoWeek(weekStart)}`}</h2>
          <p className="t-14 text-fg-2">
            {formatRange(weekStart, weekEnd)} · {formatHours(totals.total)} logged
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" aria-label="Previous week" onClick={() => setOffset((o) => o - 1)}>
            <Icon name="arrow-left" />
          </Button>
          <Button disabled={isCurrentWeek} onClick={() => setOffset(0)}>
            This week
          </Button>
          <Button size="icon" aria-label="Next week" onClick={() => setOffset((o) => o + 1)}>
            <Icon name="arrow-left" className="rotate-180" />
          </Button>
        </div>
        <div className="h-4 w-px bg-hairline" aria-hidden />
        <Button variant="brand" onClick={() => openDialog()}>
          <PlusIcon /> Add entry
        </Button>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <TimerCard projects={projects} todayMinutes={todayMinutes} />

        <section className="grid grid-cols-[1fr_260px] overflow-hidden rounded-xl border border-hairline bg-surface">
          <div className="flex flex-col gap-5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="t-14 text-fg">Hours per day</h3>
              <ChartLegend />
            </div>
            <WeekChart days={days} today={today} onSelectDay={scrollToDay} />
          </div>
          <dl className="flex flex-col border-l border-hairline">
            <Stat label="Total" value={formatHours(totals.total)} />
            <Stat label="Billable" value={formatHours(totals.billable)} color={BILLABLE_COLOR} />
            <Stat label="Non-billable" value={formatHours(totals.nonBillable)} color={NON_BILLABLE_COLOR} />
            <div className="mt-auto flex flex-col gap-2 border-t border-hairline p-4">
              <div className="flex items-center justify-between">
                <span className="t-12 text-fg-2">Billable ratio</span>
                <span className="t-12 text-fg tabular-nums">{billablePct}%</span>
              </div>
              <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-app">
                {totals.billable > 0 && (
                  <span className="h-full" style={{ width: `${billablePct}%`, background: BILLABLE_COLOR }} />
                )}
                {totals.nonBillable > 0 && (
                  <span className="h-full flex-1" style={{ background: NON_BILLABLE_COLOR }} />
                )}
              </div>
            </div>
          </dl>
        </section>

        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <div className="flex h-12 items-center justify-between border-b border-hairline px-4">
            <h3 className="t-14 text-fg">Entries</h3>
            <span className="t-12 text-fg-2">
              {weekEntries.length} {weekEntries.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
              <span className="flex size-10 items-center justify-center rounded-lg bg-app">
                <ClockIcon className="size-4 text-icon" />
              </span>
              <div className="flex flex-col gap-1.5">
                <p className="t-14 text-fg">No time logged this week</p>
                <p className="t-14 text-fg-2">Start the timer or add an entry manually.</p>
              </div>
              <Button onClick={() => openDialog()}>
                <PlusIcon /> Add entry
              </Button>
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col />
                <col className="w-[200px]" />
                <col className="w-[110px]" />
                <col className="w-[100px]" />
                <col className="w-[112px]" />
              </colgroup>
              <thead>
                <tr className="h-10 bg-app text-left">
                  <th className="t-14 px-4 font-medium text-fg-2">Task</th>
                  <th className="t-14 px-2 font-medium text-fg-2">Project</th>
                  <th className="t-14 px-2 font-medium text-fg-2">Billable</th>
                  <th className="t-14 px-2 text-right font-medium text-fg-2">Duration</th>
                  <th className="px-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              {groups.map(([date, list]) => (
                <tbody key={date}>
                  <tr id={`tt-day-${date}`} className="h-9 scroll-mt-[76px] border-y border-subtle bg-surface">
                    <th colSpan={3} className="px-4 text-left font-medium">
                      <span className="t-12 text-fg">{formatWeekday(date)}</span>
                      <span className="t-12 ml-1.5 text-fg-2">
                        {formatShort(date)}
                        {date === today && " · Today"}
                      </span>
                    </th>
                    <td className="t-12 px-2 text-right text-fg-2 tabular-nums">
                      {formatHours(list.reduce((n, e) => n + e.minutes, 0))}
                    </td>
                    <td />
                  </tr>
                  {list.map((e) => (
                    <tr key={e.id} className="h-14 border-b border-subtle transition-colors duration-150 hover-fine:bg-hover/50">
                      <td className="t-14 truncate px-4 text-table">{e.task}</td>
                      <td className="px-2">
                        <span className="t-14 flex min-w-0 items-center gap-2 text-table">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: `var(--event-${projectColor(e.project)}-fg)` }}
                          />
                          <span className="truncate">{e.project}</span>
                        </span>
                      </td>
                      <td className="px-2">
                        <Switch
                          size="sm"
                          checked={e.billable}
                          aria-label={`Billable: ${e.task}`}
                          onCheckedChange={(v) => saveTimeEntry({ ...e, billable: v })}
                        />
                      </td>
                      <td className="t-14 px-2 text-right text-table tabular-nums">{formatHours(e.minutes)}</td>
                      <td className="px-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <RowAction
                            label="Resume timer"
                            disabled={timerRunning}
                            onClick={() => startTimer(e.project, e.task)}
                          >
                            <PlayIcon />
                          </RowAction>
                          <RowAction label="Edit entry" onClick={() => openDialog(e)}>
                            <PencilIcon />
                          </RowAction>
                          <RowAction label="Delete entry" onClick={() => deleteTimeEntry(e.id)}>
                            <Trash2Icon />
                          </RowAction>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}
        </section>
      </div>

      <EntryDialog
        open={dialog.open}
        session={dialog.session}
        entry={dialog.entry}
        defaultDate={today >= weekStart && today <= weekEnd ? today : weekStart}
        projects={projects}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-2 border-b border-hairline px-4 py-3.5 last:border-b-0">
      <dt className="t-12 flex items-center gap-1.5 text-fg-2">
        {color && <span className="size-2 rounded-[2px]" style={{ background: color }} />}
        {label}
      </dt>
      <dd className="text-[20px] leading-none font-medium tracking-[-0.4px] text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function RowAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
