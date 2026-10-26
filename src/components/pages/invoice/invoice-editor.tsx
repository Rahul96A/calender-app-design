"use client";

import { useMemo, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/dialogs/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addDays } from "@/lib/dates";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { useToday } from "@/hooks/use-today";
import { uid, useAppStore } from "@/stores/app-store";
import { useInvoiceUi } from "./invoice-ui-store";
import { CURRENCIES, formatMoney, lineTotal, nextInvoiceNumber } from "./invoice-utils";

type Line = { id: string; description: string; quantity: string; rate: string };
type Draft = Omit<Invoice, "id" | "items" | "status"> & { items: Line[] };

export function InvoiceEditor() {
  const editor = useInvoiceUi((s) => s.editor);
  const closeEditor = useInvoiceUi((s) => s.closeEditor);
  return (
    <Dialog open={editor.open} onOpenChange={(v) => !v && closeEditor()}>
      <DialogContent className="max-h-[calc(100dvh-48px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 p-0 sm:max-w-[720px]">
        <EditorForm key={editor.session} invoiceId={editor.id} onDone={closeEditor} />
      </DialogContent>
    </Dialog>
  );
}

const blankLine = (): Line => ({ id: uid("it"), description: "", quantity: "1", rate: "" });

function EditorForm({ invoiceId, onDone }: { invoiceId?: string; onDone: () => void }) {
  const today = useToday();
  const invoices = useAppStore((s) => s.invoices);
  const saveInvoice = useAppStore((s) => s.saveInvoice);
  const existing = invoices.find((i) => i.id === invoiceId);

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          number: existing.number,
          client: existing.client,
          issueDate: existing.issueDate,
          dueDate: existing.dueDate,
          currency: existing.currency,
          notes: existing.notes,
          items: existing.items.map((i) => ({
            id: i.id,
            description: i.description,
            quantity: String(i.quantity),
            rate: String(i.rate),
          })),
        }
      : {
          number: nextInvoiceNumber(invoices, today),
          client: "",
          issueDate: today,
          dueDate: addDays(today, 30),
          currency: invoices[0]?.currency ?? "USD",
          notes: "Thank you for your business.",
          items: [blankLine()],
        },
  );
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setLine = (id: string, patch: Partial<Line>) =>
    setDraft((d) => ({ ...d, items: d.items.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  const clients = useMemo(() => [...new Set(invoices.map((i) => i.client))].sort(), [invoices]);
  const total = draft.items.reduce((n, l) => n + lineTotal({ quantity: Number(l.quantity), rate: Number(l.rate) }), 0);
  const filled = draft.items.filter((l) => l.description.trim() && Number(l.quantity) > 0);
  const duplicateNumber = invoices.some((i) => i.number === draft.number.trim() && i.id !== invoiceId);

  const error = !draft.client.trim()
    ? "Add a client."
    : !draft.number.trim()
      ? "Add an invoice number."
      : duplicateNumber
        ? "Another invoice already uses this number."
        : draft.dueDate < draft.issueDate
          ? "The due date can't be before the issue date."
          : filled.length === 0
            ? "Add at least one line item with a description and quantity."
            : null;

  const save = (status: InvoiceStatus) => {
    setTouched(true);
    if (error) return;
    const saved = saveInvoice({
      id: existing?.id,
      number: draft.number.trim(),
      client: draft.client.trim(),
      issueDate: draft.issueDate,
      dueDate: draft.dueDate,
      currency: draft.currency,
      notes: draft.notes,
      status,
      items: filled.map((l) => ({
        id: l.id,
        description: l.description.trim(),
        quantity: Number(l.quantity),
        rate: Number(l.rate) || 0,
      })),
    });
    toast.success(existing ? "Invoice updated" : status === "sent" ? "Invoice created and sent" : "Draft saved", {
      description: `${saved.number} · ${saved.client}`,
      action: { label: "View", onClick: () => useInvoiceUi.getState().view(saved.id) },
    });
    onDone();
  };

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        save(existing ? existing.status : "draft");
      }}
    >
      <DialogHeader className="gap-1.5 border-b border-hairline px-5 pt-5 pb-4">
        <DialogTitle className="t-16">{existing ? `Edit ${existing.number}` : "New invoice"}</DialogTitle>
        <DialogDescription className="t-14">
          {existing ? "Changes apply immediately to the invoice." : "Drafts stay private until you send them."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid content-start gap-5 overflow-y-auto scroll-thin px-5 py-5">
        <div className="grid grid-cols-[1.4fr_1fr_120px] gap-3">
          <Field label="Client" htmlFor="inv-client">
            <Input
              id="inv-client"
              list="inv-clients"
              autoFocus={!existing}
              placeholder="Company name"
              value={draft.client}
              aria-invalid={touched && !draft.client.trim()}
              onChange={(e) => set("client", e.target.value)}
            />
            <datalist id="inv-clients">
              {clients.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Invoice number" htmlFor="inv-number">
            <Input
              id="inv-number"
              value={draft.number}
              aria-invalid={touched && (duplicateNumber || !draft.number.trim())}
              onChange={(e) => set("number", e.target.value)}
            />
          </Field>
          <Field label="Currency" htmlFor="inv-currency">
            <Select value={draft.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger id="inv-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Issue date" htmlFor="inv-issue">
            <Input
              id="inv-issue"
              type="date"
              required
              value={draft.issueDate}
              onChange={(e) => set("issueDate", e.target.value)}
            />
          </Field>
          <Field label="Due date" htmlFor="inv-due">
            <div className="flex gap-1.5">
              <Input
                id="inv-due"
                type="date"
                required
                min={draft.issueDate}
                value={draft.dueDate}
                aria-invalid={draft.dueDate < draft.issueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
              {[15, 30].map((n) => (
                <Button
                  key={n}
                  type="button"
                  className="h-8 shrink-0 px-2"
                  onClick={() => set("dueDate", addDays(draft.issueDate, n))}
                >
                  Net {n}
                </Button>
              ))}
            </div>
          </Field>
        </div>

        <div className="grid gap-2">
          <span className="t-12 text-fg-2">Line items</span>
          <div className="overflow-hidden rounded-lg border border-hairline">
            <div className="grid h-8 grid-cols-[1fr_72px_104px_104px_36px] items-center gap-2 bg-app px-2">
              <span className="t-12 pl-0.5 text-fg-2">Description</span>
              <span className="t-12 text-right text-fg-2">Qty</span>
              <span className="t-12 text-right text-fg-2">Rate</span>
              <span className="t-12 text-right text-fg-2">Amount</span>
              <span />
            </div>
            {draft.items.map((l, idx) => (
              <div
                key={l.id}
                className="grid grid-cols-[1fr_72px_104px_104px_36px] items-center gap-2 border-t border-subtle px-2 py-1.5"
              >
                <Input
                  aria-label={`Line ${idx + 1} description`}
                  placeholder="Service or product"
                  value={l.description}
                  onChange={(e) => setLine(l.id, { description: e.target.value })}
                />
                <Input
                  aria-label={`Line ${idx + 1} quantity`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className="text-right tabular-nums"
                  value={l.quantity}
                  onChange={(e) => setLine(l.id, { quantity: e.target.value })}
                />
                <Input
                  aria-label={`Line ${idx + 1} rate`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  className="text-right tabular-nums"
                  value={l.rate}
                  onChange={(e) => setLine(l.id, { rate: e.target.value })}
                />
                <span className="t-14 truncate text-right text-table tabular-nums">
                  {formatMoney(lineTotal({ quantity: Number(l.quantity), rate: Number(l.rate) }), draft.currency)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove line ${idx + 1}`}
                  disabled={draft.items.length === 1}
                  onClick={() => set("items", draft.items.filter((x) => x.id !== l.id))}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-subtle bg-app px-2 py-2">
              <Button type="button" size="sm" onClick={() => set("items", [...draft.items, blankLine()])}>
                <PlusIcon /> Add line
              </Button>
              <dl className="grid grid-cols-[auto_120px] items-center gap-x-4 gap-y-2 pr-[44px]">
                <dt className="t-12 text-right text-fg-2">Subtotal</dt>
                <dd className="t-14 text-right text-table tabular-nums">{formatMoney(total, draft.currency)}</dd>
                <dt className="t-14 text-right text-fg">Total</dt>
                <dd className="t-16 text-right text-fg tabular-nums">{formatMoney(total, draft.currency)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <Field label="Notes" htmlFor="inv-notes">
          <Textarea
            id="inv-notes"
            rows={2}
            placeholder="Payment terms, bank details or a thank-you note"
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter className="m-0 items-center rounded-b-xl border-t border-hairline bg-app px-5 py-3">
        {touched && error ? (
          <p className="t-12 mr-auto text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        {existing ? (
          <Button type="submit" variant="brand">
            Save changes
          </Button>
        ) : (
          <>
            <Button type="submit">Save draft</Button>
            <Button type="button" variant="brand" onClick={() => save("sent")}>
              Create &amp; send
            </Button>
          </>
        )}
      </DialogFooter>
    </form>
  );
}
