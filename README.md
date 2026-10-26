# Kargul — Time off & calendar

A people-ops workspace built from the "Dashboard – calendar" Figma design. The
**Time off** page (`/time-off`, the default route) reproduces the design
pixel-for-pixel; every other page in the sidebar is built in the same visual
language. Everything runs in the browser — there is no backend; data persists
to `localStorage`.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS v4** with design tokens mapped from the Figma variables
- **shadcn/ui** (Radix primitives) themed to the design
- **Zustand** for state (`persist` middleware → `localStorage`)
- **next-themes** for dark mode, **Sonner** for toasts, **cmdk** for the command palette

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. To return to the exact design state, use
**Settings → Data → Reset demo data** (or clear site data).

## What works

- **Calendar** — week / day / month views; drag on empty space to create, drag
  events to move (across days), drag the bottom edge to resize; overlapping
  events lay out side by side; all-day lane with public holidays; live now-line;
  origin-aware details popover.
- **Time off** — request dialog that counts working days (skips weekends and
  holidays) and shows the balance after the request; stats computed from your
  requests and allowance; requests table with search, filters, sorting, details,
  edit/cancel/delete, and a manager approve/decline preview.
- **Shell** — workspace switcher, ⌘K search across pages/events/requests/
  documents/invoices, notifications, help menu, dark mode, account menu.
- **Keyboard** — `⌘K` search, `N` new event, `R` request time-off, `T` today,
  `←/→` previous/next, `D/W/M` views, `?` shortcuts.
- **Other pages** — Dashboard, Analytics, Personal details, Documents, Time
  tracking, Benefits, Invoice, Withdrawal methods, Settings.

## Project layout

```
src/
  app/                 routes (one folder per sidebar page)
  components/
    ui/                shadcn/ui primitives, themed
    shell/             title bar, sidebar, search, notifications, shortcuts
    calendar/          header, time grid, all-day row, month view, popover
    time-off/          stats panel, requests table, status badge
    dialogs/           app-wide dialogs (request, event, details, holidays…)
    pages/             page bodies for the secondary routes
  stores/              Zustand stores (app data, calendar view, overlays)
  hooks/               client-only "today"/"now"
  lib/                 types, date helpers, leave rules, seed data
```

The seed in `src/lib/seed.ts` is what the design shows: the week of Nov 8–14,
2026 with Tue Nov 10 selected, and allowance figures of 7 available, 2 pending,
3 upcoming.
