"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  EllipsisVerticalIcon,
  PencilIcon,
  SearchIcon,
  SendIcon,
  Trash2Icon,
  Upload,
} from "lucide-react"

import { contrastText } from "@/lib/contrast"
import { trpc } from "@/lib/trpc/client"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE_SIZE = 50

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Contact = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  message: string | null
  lastCampaignSentId: string | null
  lastCampaignSent: { name: string; color: string } | null
  createdAt: Date | string
}

export default function ContactsPage() {
  const [editTarget, setEditTarget] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  // "all" | "none" (never sent) | campaign id
  const [campaignFilter, setCampaignFilter] = useState("all")
  const [sendTarget, setSendTarget] = useState<{
    contactIds: string[]
    // set => send to everyone matching the current search/filter
    filter?: { search: string; campaignFilter: string }
    label: string
    campaignId: string
  } | null>(null)
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<{
    ids: string[]
    count: number
  } | null>(null)

  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState("")
  const [page, setPage] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const utils = trpc.useUtils()
  const { data, isPending: contactsPending } = trpc.contacts.list.useQuery(
    {
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      campaignFilter,
    },
    { placeholderData: (prev) => prev },
  )
  const filtered = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // New query -> back to the first page, selection no longer applies.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on filter change
  useEffect(() => {
    setPage(0)
    setSelectedIds([])
  }, [debouncedSearch, campaignFilter])
  const { data: campaigns = [] } = trpc.campaigns.getAll.useQuery()
  const campaignSendMutation = trpc.sends.start.useMutation({
    onSuccess: () => {
      setSelectedIds([])
      setSendTarget(null)
      // the progress panel picks the job up straight away
      utils.sends.list.invalidate()
    },
  })

  const visibleSelectedIds = selectedIds

  function openSend(contactIds: string[], label: string) {
    campaignSendMutation.reset()
    setSendTarget({ contactIds, label, campaignId: "" })
  }

  function openSendAllMatching() {
    campaignSendMutation.reset()
    setSendTarget({
      contactIds: [],
      filter: { search: debouncedSearch, campaignFilter },
      label: `all ${total.toLocaleString()} matching contacts`,
      campaignId: "",
    })
  }
  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      setEditTarget(null)
      utils.contacts.list.invalidate()
    },
  })
  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => utils.contacts.list.invalidate(),
  })
  const deleteManyMutation = trpc.contacts.deleteMany.useMutation({
    onSuccess: () => {
      setBatchDeleteTarget(null)
      setSelectedIds([])
      utils.contacts.list.invalidate()
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function openEdit(contact: Contact) {
    setEditTarget(contact)
    form.reset({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone ?? "",
    })
  }

  function onEdit(values: FormValues) {
    if (!editTarget) return
    updateMutation.mutate({ id: editTarget.id, ...values })
  }

  // The server does the actual import in the background; we only upload the
  // file. Progress shows in the global jobs panel.
  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    setImportError("")
    try {
      const res = await fetch(
        `/api/contacts/import?name=${encodeURIComponent(importFile.name)}`,
        { method: "POST", body: importFile },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setImportError(body?.error ?? `Upload failed (${res.status})`)
        return
      }
      setImportOpen(false)
      setImportFile(null)
      utils.imports.list.invalidate()
    } catch {
      setImportError("Upload failed. Check your connection and try again.")
    } finally {
      setImporting(false)
    }
  }

  async function handleExport() {
    const csvCell = (v: string) =>
      /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const line = (c: {
      firstName: string
      lastName: string
      email: string
      phone: string | null
      createdAt: Date | string
    }) =>
      [
        c.firstName,
        c.lastName,
        c.email,
        c.phone ?? "",
        new Date(c.createdAt).toLocaleDateString(),
      ]
        .map(csvCell)
        .join(",")

    const parts: string[] = ["\uFEFFFirst Name,Last Name,Email,Phone,Date\n"]

    if (selectedIds.length > 0) {
      for (const c of filtered) {
        if (selectedIds.includes(c.id)) parts.push(`${line(c)}\n`)
      }
    } else {
      // Pull the filtered list down in pages instead of all at once.
      for (let p = 0; ; p++) {
        const res = await utils.client.contacts.list.query({
          page: p,
          pageSize: 5000,
          search: debouncedSearch,
          campaignFilter,
        })
        for (const c of res.items) parts.push(`${line(c)}\n`)
        if ((p + 1) * 5000 >= res.total) break
      }
    }

    const url = URL.createObjectURL(new Blob(parts, { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "contacts.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  function toggleSelectAll() {
    if (filtered.length > 0 && visibleSelectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((c) => c.id))
    }
  }

  function handleBatchDelete() {
    if (!batchDeleteTarget) return
    deleteManyMutation.mutate({ ids: batchDeleteTarget.ids })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Contacts
          </h1>
          <p className="text-sm text-muted-foreground">
            Contacts submitted from your landing pages.
          </p>
        </div>
        <div className="flex gap-2">
          {visibleSelectedIds.length > 0 && (
            <>
              <Button
                onClick={() =>
                  openSend(
                    visibleSelectedIds,
                    `${visibleSelectedIds.length} contact${visibleSelectedIds.length !== 1 ? "s" : ""}`,
                  )
                }
              >
                <SendIcon className="mr-2 h-4 w-4" />
                Send {visibleSelectedIds.length}
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  setBatchDeleteTarget({
                    ids: visibleSelectedIds,
                    count: visibleSelectedIds.length,
                  })
                }
              >
                Delete {visibleSelectedIds.length}
              </Button>
            </>
          )}
          {visibleSelectedIds.length === 0 && total > 0 && (
            <Button variant="outline" onClick={openSendAllMatching}>
              <SendIcon className="mr-2 h-4 w-4" />
              Send all {total.toLocaleString()}
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            Export
            {visibleSelectedIds.length > 0
              ? ` ${visibleSelectedIds.length}`
              : ""}
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update the contact information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onEdit)} className="space-y-4">
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="firstName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="c-first">First Name</FieldLabel>
                      <Input
                        {...field}
                        id="c-first"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="lastName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="c-last">Last Name</FieldLabel>
                      <Input
                        {...field}
                        id="c-last"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="c-email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="c-email"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="c-phone">Phone</FieldLabel>
                    <Input
                      {...field}
                      id="c-phone"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              {editTarget?.message && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Message</p>
                  <p className="rounded-none border bg-muted/30 px-3 py-2 text-xs">
                    {editTarget.message}
                  </p>
                </div>
              )}
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return
                deleteMutation.mutate({ id: deleteTarget.id })
                setDeleteTarget(null)
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(v) => {
          if (importing) return
          setImportOpen(v)
          if (!v) {
            setImportFile(null)
            setImportError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with columns: Name (or First Name / Last Name), Email, Phone. The import runs in the background, so you can keep working.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv,.xlsx"
                disabled={importing}
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] ?? null)
                  setImportError("")
                }}
              />
            </div>
            {importError && (
              <p className="text-xs text-destructive">{importError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => setImportOpen(false)}
            >
              Close
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importing}>
              {importing ? "Uploading…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!sendTarget}
        onOpenChange={(v) => {
          if (!v) setSendTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Campaign</DialogTitle>
            <DialogDescription>
              Choose a campaign to send to{" "}
              <span className="font-medium text-foreground">
                {sendTarget?.label}
              </span>
              . It runs in the background, so you can keep working.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="send-campaign">Campaign</FieldLabel>
                <Select
                  value={sendTarget?.campaignId ?? ""}
                  onValueChange={(v) =>
                    setSendTarget((prev) =>
                      prev ? { ...prev, campaignId: v } : null,
                    )
                  }
                >
                  <SelectTrigger id="send-campaign">
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns
                      .filter(
                        (c) =>
                          c.enabled && c.template && c.mailgunAccount?.enabled,
                      )
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            {campaignSendMutation.error && (
              <p className="text-xs text-destructive">
                {campaignSendMutation.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTarget(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (!sendTarget?.campaignId) return
                campaignSendMutation.mutate({
                  campaignId: sendTarget.campaignId,
                  ...(sendTarget.filter
                    ? { filter: sendTarget.filter }
                    : { contactIds: sendTarget.contactIds }),
                })
              }}
              disabled={
                !sendTarget?.campaignId || campaignSendMutation.isPending
              }
            >
              {campaignSendMutation.isPending ? "Starting…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!batchDeleteTarget}
        onOpenChange={(v) => {
          if (!v) setBatchDeleteTarget(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Contacts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {batchDeleteTarget?.count}
              </span>{" "}
              contact{batchDeleteTarget?.count !== 1 ? "s" : ""}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteManyMutation.isPending}
              onClick={handleBatchDelete}
            >
              {deleteManyMutation.isPending
                ? "Deleting…"
                : `Delete ${batchDeleteTarget?.count ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!contactsPending && total === 0 && !debouncedSearch && campaignFilter === "all" ? (
        <div className="rounded-none border p-8 text-center text-sm text-muted-foreground">
          No contacts yet. They will appear when your landing pages start
          collecting submissions.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name, email, phone…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                <SelectItem value="none">Never sent</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    Last sent: {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {total.toLocaleString()} contact{total !== 1 ? "s" : ""}
              {visibleSelectedIds.length > 0 &&
                ` · ${visibleSelectedIds.length} selected`}
            </span>
          </div>
          <div className="rounded-none border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-0">
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer accent-primary"
                      checked={
                        filtered.length > 0 &&
                        visibleSelectedIds.length === filtered.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No contacts match.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-primary"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.firstName} {c.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {c.lastCampaignSent ? (
                        <Badge
                          style={{
                            backgroundColor: c.lastCampaignSent.color,
                            color: contrastText(c.lastCampaignSent.color),
                          }}
                        >
                          {c.lastCampaignSent.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <EllipsisVerticalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              openSend([c.id], `${c.firstName} ${c.lastName}`)
                            }
                          >
                            Send Campaign
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                id: c.id,
                                name: `${c.firstName} ${c.lastName}`,
                              })
                            }
                          >
                            <Trash2Icon className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {page + 1} of {pageCount.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => {
                  setSelectedIds([])
                  setPage((p) => p - 1)
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => {
                  setSelectedIds([])
                  setPage((p) => p + 1)
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
