"use client";

import { CheckIcon, DownloadIcon, PencilIcon, PrinterIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatLong } from "@/lib/dates";
import { useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { useInvoiceUi } from "./invoice-ui-store";
import { downloadInvoice, effectiveStatus, formatMoney, invoiceTotal, lineTotal, printInvoice } from "./invoice-utils";
import { InvoiceStatusBadge } from "./status-badge";

export function InvoiceView() {
  const viewId = useInvoiceUi((s) => s.viewId);
  const closeView = useInvoiceUi((s) => s.closeView);
  const edit = useInvoiceUi((s) => s.edit);
  const invoice = useAppStore((s) => s.invoices.find((i) => i.id === viewId));
  const profile = useAppStore((s) => s.profile);
  const setInvoiceStatus = useAppStore((s) => s.setInvoiceStatus);
  const today = useToday();

  const open = !!viewId && !!invoice;
  const status = invoice ? effectiveStatus(invoice, today) : "draft";
  const total = invoice ? invoiceTotal(invoice) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeView()}>
      <DialogContent className="max-h-[calc(100dvh-48px)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden bg-app p-0 sm:max-w-[680px]">
        {invoice && (
          <>
            <div className="flex items-center gap-2 border-b border-hairline bg-surface py-3 pr-12 pl-4">
              <DialogTitle className="t-14 min-w-0 flex-1 truncate text-fg">{invoice.number}</DialogTitle>
              <DialogDescription className="sr-only">Invoice for {invoice.client}</DialogDescription>
              {invoice.status !== "paid" && (
                <Button
                  size="sm"
                  className="px-2"
                  onClick={() => edit(invoice.id)}
                >
                  <PencilIcon className="text-icon" /> Edit
                </Button>
              )}
              <Button size="sm" className="px-2" onClick={() => printInvoice(invoice, profile)}>
                <PrinterIcon className="text-icon" /> Print
              </Button>
              <Button
                size="sm"
                className="px-2"
                onClick={() => {
                  downloadInvoice(invoice, profile);
                  toast.success("Invoice downloaded", { description: `${invoice.number}.html` });
                }}
              >
                <DownloadIcon className="text-icon" /> Download
              </Button>
              {invoice.status === "draft" ? (
                <Button
                  size="sm"
                  variant="brand"
                  className="px-2"
                  onClick={() => {
                    setInvoiceStatus(invoice.id, "sent");
                    toast.success("Invoice sent", { description: `${invoice.number} · ${invoice.client}` });
                  }}
                >
                  <SendIcon /> Send
                </Button>
              ) : invoice.status !== "paid" ? (
                <Button
                  size="sm"
                  variant="brand"
                  className="px-2"
                  onClick={() => {
                    setInvoiceStatus(invoice.id, "paid");
                    toast.success("Marked as paid", { description: `${invoice.number} · ${formatMoney(total, invoice.currency)}` });
                  }}
                >
                  <CheckIcon /> Mark as paid
                </Button>
              ) : null}
            </div>

            <div className="overflow-y-auto scroll-thin p-4">
              {/* The "paper": always reads like a printed document */}
              <article className="flex flex-col gap-7 rounded-lg border border-hairline bg-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <header className="flex items-start justify-between gap-6">
                  <div className="flex flex-col gap-2.5">
                    <h2 className="text-[24px] leading-none font-medium tracking-[-0.48px] text-heading">Invoice</h2>
                    <span className="t-14 text-fg-2">{invoice.number}</span>
                    <InvoiceStatusBadge status={status} className="mt-1 self-start" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right">
                    <span className="t-14 text-fg">{profile.name}</span>
                    <span className="t-12 text-fg-2">{profile.email}</span>
                    <span className="t-12 max-w-[220px] leading-[1.35] text-fg-2">{profile.address}</span>
                  </div>
                </header>

                <dl className="grid grid-cols-3 gap-6 border-y border-hairline py-5">
                  <Meta label="Bill to" value={invoice.client} />
                  <Meta label="Issued" value={formatLong(invoice.issueDate)} />
                  <Meta
                    label="Due"
                    value={formatLong(invoice.dueDate)}
                    danger={status === "overdue"}
                  />
                </dl>

                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="t-12 pb-2.5 text-left font-medium text-fg-2">Description</th>
                      <th className="t-12 w-16 pb-2.5 text-right font-medium text-fg-2">Qty</th>
                      <th className="t-12 w-28 pb-2.5 text-right font-medium text-fg-2">Rate</th>
                      <th className="t-12 w-28 pb-2.5 text-right font-medium text-fg-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((i) => (
                      <tr key={i.id} className="border-b border-subtle">
                        <td className="t-14 py-3.5 pr-4 leading-[1.3] text-table">{i.description}</td>
                        <td className="t-14 py-3.5 text-right text-table tabular-nums">{i.quantity}</td>
                        <td className="t-14 py-3.5 text-right text-table tabular-nums">
                          {formatMoney(i.rate, invoice.currency)}
                        </td>
                        <td className="t-14 py-3.5 text-right text-table tabular-nums">
                          {formatMoney(lineTotal(i), invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <dl className="ml-auto grid w-64 grid-cols-[1fr_auto] gap-x-4 gap-y-3">
                  <dt className="t-14 text-fg-2">Subtotal</dt>
                  <dd className="t-14 text-right text-table tabular-nums">{formatMoney(total, invoice.currency)}</dd>
                  <dt className="t-14 border-t border-hairline pt-3 text-fg">{status === "paid" ? "Total paid" : "Total due"}</dt>
                  <dd className="border-t border-hairline pt-3 text-right text-[20px] leading-none font-medium tracking-[-0.4px] text-fg tabular-nums">
                    {formatMoney(total, invoice.currency)}
                  </dd>
                </dl>

                {invoice.notes.trim() && (
                  <div className="flex flex-col gap-2 border-t border-hairline pt-5">
                    <span className="t-12 text-fg-2">Notes</span>
                    <p className="t-14 leading-[1.45] whitespace-pre-wrap text-table">{invoice.notes}</p>
                  </div>
                )}
              </article>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="t-12 text-fg-2">{label}</dt>
      <dd className={danger ? "t-14 text-danger" : "t-14 text-fg"}>{value}</dd>
    </div>
  );
}
