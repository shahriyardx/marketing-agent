"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your email campaigns.
          </p>
        </div>
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
      </div>

      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update the campaign settings.</DialogDescription>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
        <div className="rounded-none border p-8 text-center text-sm text-muted-foreground">
          No campaigns yet. Create your first campaign to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const missing: string[] = []
            if (!c.template) missing.push("Template is missing")
            if (!c.mailgunAccount) missing.push("Mailgun is missing")
            else if (!c.mailgunAccount.enabled)
              missing.push("Mailgun is disabled")
            const hasIssue = missing.length > 0

            return (
              <Card
                key={c.id}
                className={cn(
                  !c.enabled && "opacity-50",
                  hasIssue && "border-yellow-600/50 dark:border-yellow-500/50",
                )}
                style={{ borderLeft: `3px solid ${c.color}` }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle
                    className={cn(
                      "text-xs font-medium",
                      (!c.enabled || hasIssue) && "text-muted-foreground",
                    )}
                  >
                    {c.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={c.enabled}
                      disabled={hasIssue}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          id: c.id,
                          enabled: checked,
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEdit(c)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() =>
                        setDeleteTarget({ id: c.id, name: c.name })
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {hasIssue ? (
                    <div className="space-y-1 text-xs text-yellow-600 dark:text-yellow-500">
                      {missing.map((m) => (
                        <p key={m}>{m}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Template: {c.template?.name}</p>
                      <p>Mailgun: {c.mailgunAccount?.name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
