"use client"

import { useEffect, useRef } from "react"
import { XIcon } from "lucide-react"

import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"

function Bar({ pct, tone }: { pct: number | null; tone: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
      <div
        className={`h-full transition-[width] duration-500 ${tone} ${pct === null ? "w-1/3 animate-pulse" : ""}`}
        style={pct === null ? undefined : { width: `${Math.min(100, pct)}%` }}
      />
    </div>
  )
}

function Card({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose?: () => void
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-popover p-3 text-xs shadow-xl shadow-black/40">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium break-all">{title}</p>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <XIcon />
          </Button>
        )}
      </div>
      {children}
    </div>
  )
}

// Lives in the dashboard shell, so it survives page navigation. Jobs run on
// the server, so it also picks them back up after a reload.
export function BackgroundJobs() {
  const utils = trpc.useUtils()
  const poll = (jobs?: { status: string }[]) =>
    jobs?.some((j) => j.status === "running" || j.status === "pending")
      ? 1000
      : 5000
  const imports = trpc.imports.list.useQuery(undefined, {
    refetchInterval: (q) => poll(q.state.data),
  })
  const sends = trpc.sends.list.useQuery(undefined, {
    refetchInterval: (q) => poll(q.state.data),
  })
  const dismissImport = trpc.imports.dismiss.useMutation({
    onSuccess: () => utils.imports.list.invalidate(),
  })
  const dismissSend = trpc.sends.dismiss.useMutation({
    onSuccess: () => utils.sends.list.invalidate(),
  })
  const cancelSend = trpc.sends.cancel.useMutation({
    onSuccess: () => utils.sends.list.invalidate(),
  })

  // Refresh the contacts table when a job that was running finishes.
  const running = useRef(new Set<string>())
  useEffect(() => {
    const all = [...(imports.data ?? []), ...(sends.data ?? [])]
    let finished = false
    for (const j of all) {
      const active = j.status === "running" || j.status === "pending"
      if (active) running.current.add(j.id)
      else if (running.current.delete(j.id)) finished = true
    }
    if (finished) utils.contacts.list.invalidate()
  }, [imports.data, sends.data, utils])

  const importJobs = imports.data ?? []
  const sendJobs = sends.data ?? []
  if (importJobs.length === 0 && sendJobs.length === 0) return null

  return (
    <div className="fixed bottom-4 left-[76px] z-50 flex w-80 max-w-[calc(100vw-6rem)] flex-col gap-2">
      {importJobs.map((j) => {
        const active = j.status === "running" || j.status === "pending"
        const pct =
          j.bytesRead > 0 && j.bytesTotal > 0
            ? (j.bytesRead / j.bytesTotal) * 100
            : null
        return (
          <Card
            key={j.id}
            title={`Import: ${j.fileName}`}
            onClose={
              active ? undefined : () => dismissImport.mutate({ id: j.id })
            }
          >
            {active ? (
              <>
                <Bar pct={pct} tone="bg-primary" />
                <p className="text-muted-foreground">
                  {j.status === "pending" ? "Starting…" : "Importing…"}{" "}
                  {j.rows.toLocaleString()} rows read,{" "}
                  {j.created.toLocaleString()} added
                  {pct !== null && ` (${Math.floor(pct)}%)`}
                </p>
              </>
            ) : j.status === "done" ? (
              <p className="text-success">
                Done: {j.created.toLocaleString()} added
                {j.duplicates > 0 &&
                  `, ${j.duplicates.toLocaleString()} duplicates`}
                {j.invalid > 0 && `, ${j.invalid.toLocaleString()} invalid`}.
              </p>
            ) : (
              <p className="text-destructive">
                Failed: {j.error} ({j.created.toLocaleString()} added before it
                stopped)
              </p>
            )}
          </Card>
        )
      })}

      {sendJobs.map((j) => {
        if (j.status === "scheduled")
          return (
            <Card key={j.id} title={`Scheduled: ${j.campaignName}`}>
              <p className="text-muted-foreground">
                Sends{" "}
                {j.scheduledAt && new Date(j.scheduledAt).toLocaleString()} to
                about {j.total.toLocaleString()} contacts.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={cancelSend.isPending}
                onClick={() => cancelSend.mutate({ id: j.id })}
              >
                Cancel
              </Button>
            </Card>
          )
        const active = j.status === "running"
        const pct = j.total > 0 ? ((j.sent + j.failed) / j.total) * 100 : 0
        return (
          <Card
            key={j.id}
            title={`Sending: ${j.campaignName}`}
            onClose={
              active ? undefined : () => dismissSend.mutate({ id: j.id })
            }
          >
            {active && <Bar pct={pct} tone="bg-primary" />}
            <p
              className={
                j.status === "done"
                  ? "text-success"
                  : active
                    ? "text-muted-foreground"
                    : "text-destructive"
              }
            >
              {active
                ? "Sending… "
                : j.status === "done"
                  ? "Done. "
                  : j.status === "cancelled"
                    ? "Cancelled. "
                    : `${j.error ?? "Stopped"}. `}
              {j.sent.toLocaleString()} sent
              {j.failed > 0 && `, ${j.failed.toLocaleString()} failed`} of{" "}
              {j.total.toLocaleString()}
            </p>
            {j.errors.length > 0 && (
              <ul className="max-h-24 overflow-auto text-destructive">
                {j.errors.slice(0, 5).map((e) => (
                  <li key={e.email} className="break-all">
                    {e.email}: {e.error}
                  </li>
                ))}
                {j.errors.length > 5 && <li>…and more</li>}
              </ul>
            )}
            {active && (
              <Button
                variant="outline"
                size="sm"
                disabled={cancelSend.isPending}
                onClick={() => cancelSend.mutate({ id: j.id })}
              >
                Cancel
              </Button>
            )}
          </Card>
        )
      })}
    </div>
  )
}
