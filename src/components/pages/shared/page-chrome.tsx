import { cn } from "@/lib/utils";

/**
 * Shared page scaffolding for the secondary pages (dashboard, analytics,
 * personal details, documents, settings). Kept presentational so it works in
 * server and client components alike.
 */

/** Scrollable page root that fills the shell's main area. */
export function PageRoot({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto bg-app", className)} {...props}>
      {children}
    </div>
  );
}

/** 68px section header: title + secondary line on the left, 30px actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex h-[68px] shrink-0 items-center gap-4 border-b border-hairline bg-surface px-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="t-16 truncate text-fg">{title}</h2>
        {description ? <p className="t-14 truncate text-fg-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Surface card with the design's hairline border. */
export function Card({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border border-hairline bg-surface", className)} {...props}>
      {children}
    </section>
  );
}

/** Card header row: title (+ optional description) with right-aligned actions. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-h-[52px] items-center gap-3 border-b border-subtle px-4 py-3", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="t-14 truncate text-fg">{title}</h3>
        {description ? <p className="t-12 truncate text-fg-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>
  );
}

/** Calm empty state: icon, one line, one hint, optional action. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      {icon ? (
        <span className="mb-1 flex size-9 items-center justify-center rounded-[10px] bg-app text-icon [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <p className="t-14 text-fg">{title}</p>
      {hint ? <p className="t-12 max-w-[280px] leading-[1.4] text-fg-2">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Colored Figma stat glyph (the stat-*.svg files carry their own color). */
export type StatGlyph = "available" | "extra" | "holidays" | "pending" | "per-year" | "upcoming";

export function StatIcon({ name, size = 20, className }: { name: StatGlyph; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-contain bg-center bg-no-repeat", className)}
      style={{ width: size, height: size, backgroundImage: `url(/icons/stat-${name}.svg)` }}
    />
  );
}
