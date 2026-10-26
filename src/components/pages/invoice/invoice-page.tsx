"use client";

import { useMemo, useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, PencilIcon, PlusIcon, ReceiptIcon, SendIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, formatShort } from "@/lib/dates";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";
import { uid, useAppStore } from "@/stores/app-store";
import { InvoiceEditor } from "./invoice-editor";
import { useInvoiceUi } from "./invoice-ui-store";
import { effectiveStatus, formatMoney, formatTotals, invoiceTotal, nextInvoiceNumber } from "./invoice-utils";
import { InvoiceView } from "./invoice-view";
import { InvoiceStatusBadge, STATUS_LABELS } from "./status-badge";

type StatusFilter = "all" | InvoiceStatus;
const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

export function InvoicePage() {
  const today = useToday();
  const invoices = useAppStore((s) => s.invoices);
  const view = useInvoiceUi((s) => s.view);
  const edit = useInvoiceUi((s) => s.edit);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const rows = useMemo(
    () =>
      invoices
        .map((inv) => ({ inv, status: effectiveStatus(inv, today), total: invoiceTotal(inv) }))
        .sort((a, b) => b.inv.issueDate.localeCompare(a.inv.issueDate) || b.inv.number.localeCompare(a.inv.number)),
    [invoices, today],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!q || r.inv.number.toLowerCase().includes(q) || r.inv.client.toLowerCase().includes(q)),
    );
  }, [rows, query, status]);

  const stats = useMemo(() => {
    const pick = (...s: InvoiceStatus[]) => rows.filter((r) => s.includes(r.status)).map((r) => r.inv);
    return {
      outstanding: pick("sent", "overdue"),
      overdue: pick("overdue"),
      paid: pick("paid"),
      drafts: pick("draft"),
    };
  }, [rows]);

  const filtered = query.trim() !== "" || status !== "all";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-thin bg-app">
      <header className="sticky top-0 z-10 flex h-[68px] shrink-0 items-center gap-3 border-b border-hairline bg-surface px-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="t-16 text-fg">Invoices</h2>
          <p className="t-14 truncate text-fg-2">
            {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"} · {formatTotals(stats.outstanding)} outstanding
          </p>
        </div>
        <label className="flex h-[30px] w-56 items-center gap-2 rounded-lg border border-control bg-surface px-2.5 transition-[border-color,box-shadow] duration-150 focus-within:border-brand/60 focus-within:ring-3 focus-within:ring-brand/15">
          <Icon name="search" />
          <input
            type="search"
            placeholder="Search number or client"
            aria-label="Search invoices"
            className="t-14 min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              className="-mr-1 rounded p-0.5 text-icon hover-fine:text-fg"
              onClick={() => setQuery("")}
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </label>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger size="sm" className="h-[30px] w-[132px]" aria-label="Filter by status">
            <Icon name="filter" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="h-4 w-px bg-hairline" aria-hidden />
        <Button variant="brand" onClick={() => edit()}>
          <PlusIcon /> New invoice
        </Button>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-hairline bg-surface">
          <Stat label="Outstanding" value={formatTotals(stats.outstanding)} count={stats.outstanding.length} />
          <Stat
            label="Overdue"
            value={formatTotals(stats.overdue)}
            count={stats.overdue.length}
            danger={stats.overdue.length > 0}
            onClick={() => setStatus("overdue")}
          />
          <Stat label="Paid" value={formatTotals(stats.paid)} count={stats.paid.length} onClick={() => setStatus("paid")} />
          <Stat label="Drafts" value={formatTotals(stats.drafts)} count={stats.drafts.length} onClick={() => setStatus("draft")} />
        </div>

        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <span className="flex size-10 items-center justify-center rounded-lg bg-app">
                <ReceiptIcon className="size-4 text-icon" />
              </span>
              <div className="flex flex-col gap-1.5">
                <p className="t-14 text-fg">{filtered ? "No invoices match" : "No invoices yet"}</p>
                <p className="t-14 text-fg-2">
                  {filtered ? "Try a different search or status." : "Create your first invoice to get paid."}
                </p>
              </div>
              {filtered ? (
                <Button
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => edit()}>
                  <PlusIcon /> New invoice
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[160px]" />
                <col />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[150px]" />
                <col className="w-[120px]" />
                <col className="w-[56px]" />
              </colgroup>
              <thead>
                <tr className="h-10 bg-app text-left">
                  <th className="t-14 px-4 font-medium text-fg-2">Number</th>
                  <th className="t-14 px-2 font-medium text-fg-2">Client</th>
                  <th className="t-14 px-2 font-medium text-fg-2">Issued</th>
                  <th className="t-14 px-2 font-medium text-fg-2">Due</th>
                  <th className="t-14 px-2 text-right font-medium text-fg-2">Amount</th>
                  <th className="t-14 px-4 font-medium text-fg-2">Status</th>
                  <th className="pr-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ inv, status: st, total }) => (
                  <tr
                    key={inv.id}
                    onClick={() => view(inv.id)}
                    className="h-14 cursor-pointer border-b border-subtle transition-colors duration-150 last:border-b-0 hover-fine:bg-hover/50"
                  >
                    <td className="px-4">
                      <button
                        type="button"
                        className="t-14 rounded text-table outline-none focus-visible:ring-3 focus-visible:ring-brand/15"
                        onClick={(e) => {
                          e.stopPropagation();
                          view(inv.id);
                        }}
                      >
                        {inv.number}
                      </button>
                    </td>
                    <td className="t-14 truncate px-2 text-table">{inv.client}</td>
                    <td className="t-14 px-2 text-table">{formatShort(inv.issueDate)}, {inv.issueDate.slice(0, 4)}</td>
                    <td className={cn("t-14 px-2", st === "overdue" ? "text-danger" : "text-table")}>
                      {formatShort(inv.dueDate)}, {inv.dueDate.slice(0, 4)}
                    </td>
                    <td className="t-14 px-2 text-right text-table tabular-nums">{formatMoney(total, inv.currency)}</td>
                    <td className="px-4">
                      <InvoiceStatusBadge status={st} />
                    </td>
                    <td className="pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu invoice={inv} today={today} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <InvoiceView />
      <InvoiceEditor />
    </div>
  );
}

function Stat({
  label,
  value,
  count,
  danger,
  onClick,
}: {
  label: string;
  value: string;
  count: number;
  danger?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="t-12 flex w-full items-center justify-between text-fg-2">
        {label}
        <span className="text-placeholder tabular-nums">{count}</span>
      </span>
      <span
        className={cn(
          "truncate text-[20px] leading-none font-medium tracking-[-0.4px] tabular-nums",
          danger ? "text-danger" : "text-fg",
        )}
      >
        {value}
      </span>
    </>
  );
  const base = "flex min-w-0 flex-col gap-2.5 border-r border-hairline px-4 py-3.5 text-left last:border-r-0";
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      title={`Show ${label.toLowerCase()}`}
      onClick={onClick}
      className={cn(base, "outline-none transition-colors duration-150 hover-fine:bg-hover/50 focus-visible:bg-hover")}
    >
      {body}
    </button>
  );
}

function RowMenu({ invoice, today }: { invoice: Invoice; today: string }) {
  const invoices = useAppStore((s) => s.invoices);
  const saveInvoice = useAppStore((s) => s.saveInvoice);
  const setInvoiceStatus = useAppStore((s) => s.setInvoiceStatus);
  const deleteInvoice = useAppStore((s) => s.deleteInvoice);
  const view = useInvoiceUi((s) => s.view);
  const edit = useInvoiceUi((s) => s.edit);

  const mark = (status: InvoiceStatus) => {
    setInvoiceStatus(invoice.id, status);
    toast.success(status === "paid" ? "Marked as paid" : "Marked as sent", {
      description: `${invoice.number} · ${invoice.client}`,
      action: { label: "Undo", onClick: () => useAppStore.getState().setInvoiceStatus(invoice.id, invoice.status) },
    });
  };

  const duplicate = () => {
    const copy = saveInvoice({
      ...invoice,
      id: undefined,
      number: nextInvoiceNumber(invoices, today),
      status: "draft",
      issueDate: today,
      dueDate: addDays(today, 30),
      items: invoice.items.map((i) => ({ ...i, id: uid("it") })),
    });
    toast.success("Invoice duplicated", {
      description: `${copy.number} · draft`,
      action: { label: "Edit", onClick: () => useInvoiceUi.getState().edit(copy.id) },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${invoice.number}`}>
          <Icon name="more" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => view(invoice.id)}>
          <EyeIcon /> View
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => edit(invoice.id)}>
          <PencilIcon /> Edit
        </DropdownMenuItem>
        {invoice.status === "draft" && (
          <DropdownMenuItem onSelect={() => mark("sent")}>
            <SendIcon /> Mark as sent
          </DropdownMenuItem>
        )}
        {invoice.status !== "paid" && (
          <DropdownMenuItem onSelect={() => mark("paid")}>
            <CheckIcon /> Mark as paid
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={duplicate}>
          <CopyIcon /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => deleteInvoice(invoice.id)}>
          <Trash2Icon /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
