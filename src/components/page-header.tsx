import { cn } from "@/lib/utils"

/** Top bar of every dashboard page: title, optional count, actions on the right. */
export function PageHeader({
  title,
  count,
  children,
}: {
  title: string
  count?: number | string
  children?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-[52px] w-full max-w-[1360px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-7">
        <h1 className="font-heading text-[15px] font-semibold">{title}</h1>
        {count !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">
            {typeof count === "number" ? count.toLocaleString() : count}
          </span>
        )}
        {children && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {children}
          </div>
        )}
      </div>
    </header>
  )
}

/** Padded content area under a PageHeader. */
export function PageBody({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-4 py-5 sm:px-7",
        className,
      )}
    >
      {children}
    </div>
  )
}
