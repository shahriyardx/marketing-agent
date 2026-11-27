"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { PageBody, PageHeader } from "@/components/page-header"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch"
import { ColorPicker } from "@/components/color-picker"

const COLOR_PRESETS = [
  "#5865F2",
  "#248046",
  "#da373c",
  "#f0b232",
  "#059669",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#64748b",
]

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  mailgunAccountId: z.string().min(1, "Mailgun account is required"),
  templateId: z.string().min(1, "Template is required"),
  color: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Campaign = {
  id: string
  name: string
  color: string
  enabled: boolean
  mailgunAccount: { id: string; name: string; enabled: boolean } | null
  template: { id: string; name: string } | null
  createdAt: Date | string
}

export default function CampaignsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Campaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data: campaigns = [] } = trpc.campaigns.getAll.useQuery()
  const { data: mailgunAccounts = [] } = trpc.mailgun.getAll.useQuery()
  const { data: templates = [] } = trpc.templates.getAll.useQuery()

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false)
      form.reset()
      utils.campaigns.getAll.invalidate()
    },
  })
  const updateMutation = trpc.campaigns.update.useMutation({
    onSuccess: () => {
      setEditTarget(null)
      form.reset()
      utils.campaigns.getAll.invalidate()
    },
  })
  const toggleMutation = trpc.campaigns.toggle.useMutation({
    onSuccess: () => utils.campaigns.getAll.invalidate(),
  })
  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => utils.campaigns.getAll.invalidate(),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      mailgunAccountId: "",
      templateId: "",
      color: "#5865F2",
    },
  })

  function onCreate(values: FormValues) {
    createMutation.mutate(values)
  }

  function onEdit(values: FormValues) {
    if (!editTarget) return
    updateMutation.mutate({ id: editTarget.id, ...values })
  }

  function openEdit(c: Campaign) {
    setEditTarget(c)
    form.reset({
      name: c.name,
      color: c.color,
      mailgunAccountId: c.mailgunAccount?.id ?? "",
      templateId: c.template?.id ?? "",
    })
  }

  return (
    <>
      <PageHeader title="Campaigns">
        <Dialog
          open={createOpen}
          onOpenChange={(v) => {
            setCreateOpen(v)
            if (!v) form.reset()
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>
                Select a template and Mailgun account for this campaign.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
              <FieldGroup>
                <Controller
                  name="name"
                  control={form.control as any}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="c-name">Campaign Name</FieldLabel>
                      <Input
                        {...field}
                        id="c-name"
                        placeholder="Welcome Series"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="templateId"
                  control={form.control as any}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="c-template">Template</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="mailgunAccountId"
                  control={form.control as any}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="c-mailgun">
                        Mailgun Account
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                          {mailgunAccounts
                            .filter((a) => a.enabled)
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <ColorPicker control={form.control as any} name="color" />
              </FieldGroup>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create Campaign"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <PageBody>
        <Dialog
          open={!!editTarget}
          onOpenChange={(v) => {
            if (!v) setEditTarget(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
              <DialogDescription>
                Update the campaign settings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onEdit)} className="space-y-4">
              <FieldGroup>
                <Controller
                  name="name"
                  control={form.control as any}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="ec-name">Campaign Name</FieldLabel>
                      <Input
                        {...field}
                        id="ec-name"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="templateId"
                  control={form.control as any}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="ec-template">Template</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="mailgunAccountId"
                  control={form.control as any}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="ec-mailgun">
                        Mailgun Account
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                          {mailgunAccounts
                            .filter((a) => a.enabled)
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <ColorPicker control={form.control as any} name="color" />
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
              <DialogTitle>Delete Campaign</DialogTitle>
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

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <h2 className="font-heading text-base font-semibold">
              No campaigns yet
            </h2>
            <p className="max-w-sm text-muted-foreground">
              A campaign pairs a template with a sending domain. Create one,
              then send it from Contacts.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New campaign
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Template</th>
                  <th className="px-3 py-2.5 font-medium">Sending domain</th>
                  <th className="px-3 py-2.5 text-right font-medium">Sent</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="w-24 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const missing: string[] = []
                  if (!c.template) missing.push("No template")
                  if (!c.mailgunAccount) missing.push("No sending domain")
                  else if (!c.mailgunAccount.enabled)
                    missing.push("Sending domain is off")
                  const hasIssue = missing.length > 0

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2.5 font-medium">
                          <span
                            className="size-2.5 shrink-0 rounded-[3px]"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {c.template?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {c.mailgunAccount?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground">
                        {c._count.sends.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        {hasIssue ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-warning">
                            <span className="size-1.5 rounded-full bg-warning" />
                            {missing.join(" · ")}
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              aria-label={`${c.enabled ? "Pause" : "Activate"} ${c.name}`}
                              checked={c.enabled}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({
                                  id: c.id,
                                  enabled: checked,
                                })
                              }
                            />
                            {c.enabled ? "Active" : "Paused"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${c.name}`}
                            onClick={() => openEdit(c)}
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${c.name}`}
                            className="hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({ id: c.id, name: c.name })
                            }
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>
    </>
  )
}
