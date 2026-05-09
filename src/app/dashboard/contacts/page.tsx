"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PencilIcon, Trash2Icon } from "lucide-react"

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
  createdAt: Date | string
}

export default function ContactsPage() {
  const [editTarget, setEditTarget] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data: contacts = [] } = trpc.contacts.getAll.useQuery()
  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      setEditTarget(null)
      utils.contacts.getAll.invalidate()
    },
  })
  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => utils.contacts.getAll.invalidate(),
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

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Contacts
        </h1>
        <p className="text-sm text-muted-foreground">
          Contacts submitted from your landing pages.
        </p>
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(c)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setDeleteTarget({
                            id: c.id,
                            name: `${c.firstName} ${c.lastName}`,
                          })
                        }
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
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
