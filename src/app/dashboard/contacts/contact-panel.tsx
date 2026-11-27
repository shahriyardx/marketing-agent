"use client"

import { PencilIcon, Trash2Icon, XIcon } from "lucide-react"

import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { contactStatus, initials, timeAgo } from "./status"

/** Right-hand panel: one contact's details and send history. */
export function ContactPanel({
  id,
  onClose,
  onEdit,
  onDelete,
  onAddToList,
  onSend,
}: {
  id: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onAddToList: () => void
  onSend: () => void
}) {
  const { data: c } = trpc.contacts.detail.useQuery({ id })
  const { data: sends = [], isPending: historyPending } =
    trpc.contacts.history.useQuery({ id })

  if (!c) {
    return (
      <aside className="sticky top-[52px] hidden h-[calc(100dvh-52px)] w-[380px] shrink-0 border-l bg-card lg:block" />
    )
  }

  const status = contactStatus(c)
  const blockedNote = c.complainedAt
    ? "Marked your email as spam. Never emailed again."
    : c.bouncedAt
      ? (c.bounceReason ?? "Address can't receive email.")
      : c.unsubscribedAt
        ? "Unsubscribed. Never emailed again."
        : null

  return (
    <aside
      aria-label={`${c.firstName} ${c.lastName}`}
      className="sticky top-[52px] flex h-[calc(100dvh-52px)] w-[380px] shrink-0 flex-col gap-5 overflow-y-auto border-l bg-card p-[22px] max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:top-0 max-lg:z-40 max-lg:h-dvh max-lg:shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-[15px] font-semibold">
          {initials(c.firstName, c.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-base font-semibold">
            {c.firstName} {c.lastName}
          </h2>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {c.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>

      <dl className="grid grid-cols-[96px_1fr] gap-y-2.5">
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
          {blockedNote && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {blockedNote}
            </span>
          )}
        </dd>
        <dt className="text-muted-foreground">Phone</dt>
        <dd>{c.phone || "—"}</dd>
        <dt className="text-muted-foreground">Lists</dt>
        <dd className="flex flex-wrap gap-1">
          {c.lists.length === 0
            ? "—"
            : c.lists.map((m) => (
                <span
                  key={m.list.id}
                  className="rounded-full border px-2 py-0.5 text-xs"
                >
                  {m.list.name}
                </span>
              ))}
        </dd>
        <dt className="text-muted-foreground">Added</dt>
        <dd>
          {new Date(c.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </dd>
        {c.message && (
          <>
            <dt className="text-muted-foreground">Message</dt>
            <dd className="whitespace-pre-line text-muted-foreground">
              {c.message}
            </dd>
          </>
        )}
      </dl>

      <section className="flex flex-col">
        <h3 className="mb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Send history
        </h3>
        {historyPending ? (
          <p className="py-2 text-muted-foreground">Loading…</p>
        ) : sends.length === 0 ? (
          <p className="py-2 text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <ol>
            {sends.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[14px_1fr_auto] items-start gap-2.5 border-b border-border/60 py-2.5"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 rounded-full",
                    s.status === "sent" ? "bg-success" : "bg-warning",
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.campaignName}</p>
                  <p
                    className="truncate text-xs text-muted-foreground"
                    title={s.error ?? undefined}
                  >
                    {s.status === "sent"
                      ? `Sent from ${s.domain || "unknown domain"}`
                      : `Failed · ${s.error ?? "unknown error"}`}
                  </p>
                </div>
                <time
                  dateTime={new Date(s.createdAt).toISOString()}
                  className="font-mono text-[11px] text-muted-foreground"
                >
                  {timeAgo(s.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-auto flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete contact"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
        <Button variant="outline" className="flex-1" onClick={onEdit}>
          <PencilIcon />
          Edit
        </Button>
        <Button variant="outline" className="flex-1" onClick={onAddToList}>
          Add to list
        </Button>
        <Button
          variant="accent"
          className="flex-1"
          disabled={!!blockedNote}
          onClick={onSend}
        >
          Send
        </Button>
      </div>
    </aside>
  )
}
