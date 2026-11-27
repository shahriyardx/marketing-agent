"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UploadIcon } from "lucide-react"

import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type Filter = {
  search: string
  campaignFilter: string
  listId: string | null
  status: string
}

/** Who an action is for: ticked contacts, or everyone matching the filter. */
export type Audience =
  | { label: string; contactIds: string[] }
  | { label: string; filter: Filter }

const close = (fn: () => void) => (open: boolean) => {
  if (!open) fn()
}

// ---------------------------------------------------------------- confirm

export function ConfirmDialog({
  open,
  title,
  children,
  action,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  action: string
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={close(onClose)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Deleting…" : action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- edit

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

export function EditContactDialog({
  contact,
  onClose,
}: {
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
  } | null
  onClose: () => void
}) {
  const utils = trpc.useUtils()
  const update = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.invalidate()
      onClose()
    },
  })
  const form = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  useEffect(() => {
    if (contact)
      form.reset({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone ?? "",
      })
  }, [contact, form])

  const field = (name: keyof EditValues, label: string, id: string) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input {...field} id={id} aria-invalid={fieldState.invalid} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )

  return (
    <Dialog open={!!contact} onOpenChange={close(onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(
            (v) => contact && update.mutate({ id: contact.id, ...v }),
          )}
          className="space-y-4"
        >
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              {field("firstName", "First name", "c-first")}
              {field("lastName", "Last name", "c-last")}
            </div>
            {field("email", "Email", "c-email")}
            {field("phone", "Phone", "c-phone")}
          </FieldGroup>
          {update.error && (
            <p className="text-xs text-destructive">{update.error.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- import

export function ImportDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const utils = trpc.useUtils()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  // The server imports in the background; progress shows in the jobs panel.
  async function upload() {
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const res = await fetch(
        `/api/contacts/import?name=${encodeURIComponent(file.name)}`,
        { method: "POST", body: file },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? `Upload failed (${res.status})`)
        return
      }
      utils.imports.list.invalidate()
      setFile(null)
      onClose()
    } catch {
      setError("Upload failed. Check your connection and try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (uploading || v) return
        setFile(null)
        setError("")
        onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            A CSV or Excel file with Email and Name (or First name and Last
            name) columns. Phone is optional. It imports in the background.
          </DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed bg-background px-4 py-8 text-center hover:bg-muted/40">
          <UploadIcon className="size-5 text-muted-foreground" />
          <span className="font-medium">
            {file ? file.name : "Choose a .csv or .xlsx file"}
          </span>
          <span className="text-xs text-muted-foreground">
            {file
              ? `${(file.size / 1024).toFixed(0)} KB`
              : "Duplicates are skipped"}
          </span>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setError("")
            }}
          />
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={uploading} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={upload} disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- send

// Value for <input type="datetime-local">: now + `minutes`, in local time.
function localInputValue(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000)
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

export function SendDialog({
  audience,
  onClose,
  onSent,
}: {
  audience: Audience | null
  onClose: () => void
  onSent: () => void
}) {
  const utils = trpc.useUtils()
  const { data: campaigns = [] } = trpc.campaigns.getAll.useQuery()
  const [campaignId, setCampaignId] = useState("")
  const [skipAlreadySent, setSkipAlreadySent] = useState(true)
  // "" = send now; otherwise a datetime-local value in the browser's time zone
  const [scheduleAt, setScheduleAt] = useState("")
  const start = trpc.sends.start.useMutation({
    onSuccess: () => {
      utils.sends.list.invalidate()
      onSent()
    },
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset per open
  useEffect(() => {
    if (!audience) return
    setCampaignId("")
    setSkipAlreadySent(true)
    setScheduleAt("")
    start.reset()
  }, [audience])

  const usable = campaigns.filter(
    (c) => c.enabled && c.template && c.mailgunAccount?.enabled,
  )

  return (
    <Dialog open={!!audience} onOpenChange={close(onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send campaign</DialogTitle>
          <DialogDescription>
            To{" "}
            <span className="font-medium text-foreground">
              {audience?.label}
            </span>
            . Unsubscribed, bounced and spam-reporting contacts are skipped.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="send-campaign">Campaign</FieldLabel>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger id="send-campaign" className="w-full">
                <SelectValue
                  placeholder={
                    usable.length ? "Choose a campaign" : "No ready campaigns"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {usable.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <fieldset className="grid grid-cols-2 gap-1 rounded-lg border bg-background p-1">
          <legend className="sr-only">When</legend>
          {[
            {
              label: "Send now",
              on: !scheduleAt,
              pick: () => setScheduleAt(""),
            },
            {
              label: "Schedule",
              on: !!scheduleAt,
              pick: () => setScheduleAt(scheduleAt || localInputValue(60)),
            },
          ].map((o) => (
            <label
              key={o.label}
              className={
                o.on
                  ? "flex h-8 cursor-pointer items-center justify-center rounded-md bg-muted font-medium has-focus-visible:ring-1 has-focus-visible:ring-ring"
                  : "flex h-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground has-focus-visible:ring-1 has-focus-visible:ring-ring"
              }
            >
              <input
                type="radio"
                name="send-when"
                className="sr-only"
                checked={o.on}
                onChange={o.pick}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
        {scheduleAt && (
          <div className="space-y-1.5">
            <Input
              type="datetime-local"
              aria-label="Send at"
              value={scheduleAt}
              min={localInputValue(1)}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {Intl.DateTimeFormat().resolvedOptions().timeZone} time. Block
              lists and lists are checked again when it starts.
            </p>
          </div>
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={skipAlreadySent}
            onChange={(e) => setSkipAlreadySent(e.target.checked)}
          />
          Skip people who already got this campaign
        </label>

        {start.error && (
          <p className="text-xs text-destructive">{start.error.message}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            disabled={!campaignId || start.isPending}
            onClick={() =>
              audience &&
              start.mutate({
                campaignId,
                skipAlreadySent,
                ...(scheduleAt ? { scheduledAt: new Date(scheduleAt) } : {}),
                ...("filter" in audience
                  ? { filter: audience.filter }
                  : { contactIds: audience.contactIds }),
              })
            }
          >
            {start.isPending ? "Starting…" : scheduleAt ? "Schedule" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- add to list

export function AddToListDialog({
  audience,
  onClose,
  onAdded,
}: {
  audience: Audience | null
  onClose: () => void
  onAdded: () => void
}) {
  const utils = trpc.useUtils()
  const { data: lists = [] } = trpc.lists.getAll.useQuery()
  const [listId, setListId] = useState("")
  const [newName, setNewName] = useState("")
  const add = trpc.lists.addContacts.useMutation({
    onSuccess: () => {
      utils.lists.getAll.invalidate()
      utils.contacts.invalidate()
      onAdded()
    },
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset per open
  useEffect(() => {
    if (!audience) return
    setListId("")
    setNewName("")
    add.reset()
  }, [audience])

  return (
    <Dialog open={!!audience} onOpenChange={close(onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to list</DialogTitle>
          <DialogDescription>
            Add{" "}
            <span className="font-medium text-foreground">
              {audience?.label}
            </span>
            . People already in the list are not added twice.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="add-list">List</FieldLabel>
            <Select
              value={listId || "new"}
              onValueChange={(v) => setListId(v === "new" ? "" : v)}
            >
              <SelectTrigger id="add-list" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New list…</SelectItem>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {l._count.members.toLocaleString()}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {!listId && (
            <Field>
              <FieldLabel htmlFor="add-list-name">New list name</FieldLabel>
              <Input
                id="add-list-name"
                autoFocus
                placeholder="UK leads"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>
          )}
        </FieldGroup>
        {add.error && (
          <p className="text-xs text-destructive">{add.error.message}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={add.isPending || (!listId && !newName.trim())}
            onClick={() =>
              audience &&
              add.mutate({
                target:
                  "filter" in audience
                    ? { filter: audience.filter }
                    : { contactIds: audience.contactIds },
                ...(listId ? { listId } : { newListName: newName }),
              })
            }
          >
            {add.isPending ? "Adding…" : "Add to list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
