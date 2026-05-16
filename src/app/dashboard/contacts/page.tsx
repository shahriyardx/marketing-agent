"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  EllipsisVerticalIcon,
  PencilIcon,
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
  const [sendTarget, setSendTarget] = useState<{
    contact: Contact
    campaignId: string
  } | null>(null)
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<{
    ids: string[]
    count: number
  } | null>(null)

  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsedContacts, setParsedContacts] = useState<
    { firstName: string; lastName: string; email: string; phone: string }[]
  >([])
  const [parseError, setParseError] = useState("")

  const utils = trpc.useUtils()
  const { data: contacts = [] } = trpc.contacts.getAll.useQuery()
  const { data: campaigns = [] } = trpc.campaigns.getAll.useQuery()
  const campaignSendMutation = trpc.campaigns.send.useMutation({
    onSuccess: () => {
      setSendTarget(null)
    },
  })
  const importExcelMutation = trpc.contacts.importExcel.useMutation({
    onSuccess: () => {
      setImportOpen(false)
      setImportFile(null)
      setParsedContacts([])
      utils.contacts.getAll.invalidate()
    },
  })
  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      setEditTarget(null)
      utils.contacts.getAll.invalidate()
    },
  })
  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => utils.contacts.getAll.invalidate(),
  })
  const deleteManyMutation = trpc.contacts.deleteMany.useMutation({
    onSuccess: () => {
      setBatchDeleteTarget(null)
      setSelectedIds([])
      utils.contacts.getAll.invalidate()
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

  function parseContactRow(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
  ) {
    return { firstName, lastName, email, phone }
  }

  async function parseImportFile(file: File) {
    setParseError("")

    const { Workbook } = await import("exceljs")
    const buf = await file.arrayBuffer()
    const wb = await new Workbook().xlsx.load(buf)
    const ws = wb.worksheets[0]
    if (!ws) {
      setParseError("File has no worksheets")
      return
    }

    const rowCount = ws.rowCount
    if (rowCount < 2) {
      setParseError("Sheet must have a header row and at least one contact")
      return
    }

    function cellText(v: unknown): string {
      if (v && typeof v === "object" && "text" in v)
        return String((v as { text: string }).text)
      return String(v ?? "")
    }

    const headerRow = ws.getRow(1)
    const headers = (headerRow.values as unknown[]).map((h) =>
      cellText(h).toLowerCase().trim(),
    )
    const firstNameIdx = headers.findIndex(
      (h) => h === "first name" || h === "firstname",
    )
    const lastNameIdx = headers.findIndex(
      (h) => h === "last name" || h === "lastname",
    )
    const nameIdx = headers.findIndex((h) => h === "name" || h === "full name")
    const emailIdx = headers.findIndex((h) => h === "email")
    const phoneIdx = headers.findIndex((h) => h === "phone")

    if (emailIdx === -1) {
      setParseError('Spreadsheet must have an "Email" column')
      return
    }

    if (firstNameIdx === -1 && nameIdx === -1) {
      setParseError('Spreadsheet must have "Name" or "First Name" column')
      return
    }

    const contacts: {
      firstName: string
      lastName: string
      email: string
      phone: string
    }[] = []

    for (let i = 2; i <= rowCount; i++) {
      const vals = ws.getRow(i).values as unknown[]
      const email = cellText(vals[emailIdx]).trim()
      if (!email) continue

      let firstName: string
      let lastName: string
      if (firstNameIdx !== -1) {
        firstName = cellText(vals[firstNameIdx]).trim()
        lastName = lastNameIdx !== -1 ? cellText(vals[lastNameIdx]).trim() : ""
      } else {
        const fullName = cellText(vals[nameIdx]).trim()
        const spaceIdx = fullName.indexOf(" ")
        firstName = spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx)
        lastName = spaceIdx === -1 ? "" : fullName.slice(spaceIdx + 1)
      }
      if (!firstName) continue

      const phone = phoneIdx !== -1 ? cellText(vals[phoneIdx]).trim() : ""
      contacts.push(parseContactRow(firstName, lastName, email, phone))
    }

    if (contacts.length === 0) {
      setParseError("No valid contacts found")
      return
    }

    setParsedContacts(contacts)
  }

  function handleImport() {
    importExcelMutation.mutate({ contacts: parsedContacts })
  }

  async function handleExport() {
    const { Workbook } = await import("exceljs")
    const wb = new Workbook()
    const ws = wb.addWorksheet("Contacts")

    const selected =
      selectedIds.length > 0
        ? contacts.filter((c) => selectedIds.includes(c.id))
        : contacts

    ws.columns = [
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "Email", key: "email", width: 35 },
      { header: "Phone", key: "phone", width: 20 },
      { header: "Date", key: "date", width: 15 },
    ]

    ws.addRows(
      selected.map((c) => ({
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone || "",
        date: new Date(c.createdAt).toLocaleDateString(),
      })),
    )

    ws.getRow(1).font = { bold: true }

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "contacts.xlsx"
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(contacts.map((c) => c.id))
    }
  }

  function handleBatchDelete() {
    if (selectedIds.length === 0) return
    deleteManyMutation.mutate({ ids: selectedIds })
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
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() =>
                setBatchDeleteTarget({
                  ids: selectedIds,
                  count: selectedIds.length,
                })
              }
            >
              Delete {selectedIds.length}
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            Export{selectedIds.length > 0 ? ` ${selectedIds.length}` : ""}
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
          setImportOpen(v)
          if (!v) {
            setImportFile(null)
            setParsedContacts([])
            setParseError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>
              Upload an Excel file with columns: Name, Email, Phone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".xlsx"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setImportFile(file)
                    await parseImportFile(file)
                  }
                }}
              />
            </div>
            {parseError && (
              <p className="text-xs text-destructive">{parseError}</p>
            )}
            {parsedContacts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {parsedContacts.length} contact
                {parsedContacts.length !== 1 ? "s" : ""} ready to import.
              </p>
            )}
            {importExcelMutation.error && (
              <p className="text-xs text-destructive">
                {importExcelMutation.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                parsedContacts.length === 0 || importExcelMutation.isPending
              }
            >
              {importExcelMutation.isPending
                ? "Importing…"
                : `Import ${parsedContacts.length} Contact${parsedContacts.length !== 1 ? "s" : ""}`}
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
                {sendTarget?.contact.firstName} {sendTarget?.contact.lastName}
              </span>
              .
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
            {campaignSendMutation.isSuccess && (
              <p className="text-xs text-emerald-600">
                Campaign sent successfully!
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
                  contactId: sendTarget.contact.id,
                })
              }}
              disabled={
                !sendTarget?.campaignId || campaignSendMutation.isPending
              }
            >
              {campaignSendMutation.isPending ? "Sending…" : "Send"}
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

      {contacts.length === 0 ? (
        <div className="rounded-none border p-8 text-center text-sm text-muted-foreground">
          No contacts yet. They will appear when your landing pages start
          collecting submissions.
        </div>
      ) : (
        <div className="rounded-none border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-0">
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer accent-primary"
                    checked={
                      contacts.length > 0 &&
                      selectedIds.length === contacts.length
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
              {contacts.map((c) => (
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
                            setSendTarget({ contact: c, campaignId: "" })
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
      )}
    </>
  )
}
