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
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

const formSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  apiKey: z.string(),
  domain: z
    .string()
    .min(1, "Domain is required")
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Enter a valid domain"),
  fromEmail: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type Account = {
  id: string
  name: string
  apiKey: string
  domain: string
  fromEmail: string
  sentCount: number
  enabled: boolean
}

export default function MailgunPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [disableTarget, setDisableTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data: accounts = [] } = trpc.mailgun.getAll.useQuery()
  const createMutation = trpc.mailgun.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false)
      form.reset()
      utils.mailgun.getAll.invalidate()
    },
    onError: (e) => form.setError("domain", { message: e.message }),
  })
  const updateMutation = trpc.mailgun.update.useMutation({
    onSuccess: () => {
      setEditTarget(null)
      form.reset()
      utils.mailgun.getAll.invalidate()
    },
    onError: (e) => form.setError("domain", { message: e.message }),
  })
  const toggleMutation = trpc.mailgun.toggle.useMutation({
    onSuccess: () => utils.mailgun.getAll.invalidate(),
  })
  const deleteMutation = trpc.mailgun.delete.useMutation({
    onSuccess: () => utils.mailgun.getAll.invalidate(),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", apiKey: "", domain: "", fromEmail: "noreply" },
  })

  function validateApiKey(isEdit: boolean) {
    const key = form.getValues("apiKey").trim()

    if (!key) {
      if (!isEdit) {
        form.setError("apiKey", { message: "API key is required" })
        return false
      }
      form.clearErrors("apiKey")
      return true
    }

    if (!key.startsWith("key-") && key.length < 20) {
      form.setError("apiKey", { message: "Enter a valid Mailgun API key" })
      return false
    }

    form.clearErrors("apiKey")
    return true
  }

  async function onCreate(values: FormValues) {
    if (!validateApiKey(false)) return

    createMutation.mutate({ ...values, apiKey: values.apiKey.trim() })
  }

  async function onEdit(values: FormValues) {
    if (!editTarget) return
    if (!validateApiKey(true)) return

    const trimmedKey = values.apiKey.trim()

    updateMutation.mutate({
      id: editTarget.id,
      name: values.name,
      domain: values.domain,
      fromEmail: values.fromEmail,
      apiKey: trimmedKey || undefined,
    })
  }

  function openEdit(account: Account) {
    setEditTarget(account)
    form.reset({
      name: account.name,
      apiKey: "",
      domain: account.domain,
      fromEmail: account.fromEmail,
    })
  }

  function openCreate() {
    setCreateOpen(true)
    form.reset({ name: "", apiKey: "", domain: "", fromEmail: "noreply" })
  }

  return (
    <>
      <PageHeader title="Sending domains">
        <Button onClick={openCreate}>
          <PlusIcon />
          Add domain
        </Button>
      </PageHeader>
      <PageBody>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <h2 className="font-heading text-base font-semibold">
              No sending domains yet
            </h2>
            <p className="max-w-sm text-muted-foreground">
              Add a Mailgun domain and its API key. Campaigns send through it.
            </p>
            <Button onClick={openCreate}>
              <PlusIcon />
              Add domain
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="border-b text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Domain</th>
                  <th className="px-3 py-2.5 font-medium">From</th>
                  <th className="px-3 py-2.5 font-medium">API key</th>
                  <th className="px-3 py-2.5 font-medium">Unsubscribe link</th>
                  <th className="px-3 py-2.5 text-right font-medium">Sent</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="w-24 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{account.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.name}
                      </p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      {account.fromEmail || "noreply"}@{account.domain}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      ••••{account.apiKey.slice(-4)}
                    </td>
                    <td className="px-3 py-3">
                      <UnsubscribeStatus id={account.id} />
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground">
                      {account.sentCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          aria-label={`Turn ${account.enabled ? "off" : "on"} ${account.domain}`}
                          checked={account.enabled}
                          onCheckedChange={(checked) => {
                            if (!checked) {
                              setDisableTarget({
                                id: account.id,
                                name: account.name,
                              })
                            } else {
                              toggleMutation.mutate({
                                id: account.id,
                                enabled: true,
                              })
                            }
                          }}
                        />
                        {account.enabled ? "On" : "Off"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${account.domain}`}
                          onClick={() => openEdit(account)}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${account.domain}`}
                          className="hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              id: account.id,
                              name: account.name,
                            })
                          }
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <Dialog
            open={!!disableTarget}
            onOpenChange={(v) => {
              if (!v) setDisableTarget(null)
            }}
          >
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Disable Mailgun Account</DialogTitle>
                <DialogDescription>
                  Disabling{" "}
                  <span className="font-medium text-foreground">
                    {disableTarget?.name}
                  </span>{" "}
                  will also disable all campaigns linked to it. Are you sure?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDisableTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!disableTarget) return
                    toggleMutation.mutate({
                      id: disableTarget.id,
                      enabled: false,
                    })
                    setDisableTarget(null)
                  }}
                >
                  Disable
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!editTarget}
            onOpenChange={(v) => {
              if (!v) setEditTarget(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Mailgun Account</DialogTitle>
                <DialogDescription>
                  Leave the API key empty to keep the current one.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onEdit)} className="space-y-4">
                <FieldGroup>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="edit-name">
                          Account Name
                        </FieldLabel>
                        <Input
                          {...field}
                          id="edit-name"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="apiKey"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="edit-key">API Key</FieldLabel>
                        <Input
                          {...field}
                          id="edit-key"
                          placeholder="Leave empty to keep current"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="domain"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="edit-domain">Domain</FieldLabel>
                        <Input
                          {...field}
                          id="edit-domain"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="fromEmail"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="edit-from">From Email</FieldLabel>
                        <Input
                          {...field}
                          id="edit-from"
                          placeholder="noreply"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
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
                <DialogTitle>Delete Mailgun Account</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-foreground">
                    {deleteTarget?.name}
                  </span>
                  ? All campaigns linked to this account will be disabled. This
                  action cannot be undone.
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
            open={createOpen}
            onOpenChange={(v) => {
              setCreateOpen(v)
              if (!v) form.reset()
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Mailgun Account</DialogTitle>
                <DialogDescription>
                  Enter your Mailgun API credentials to enable campaign
                  delivery.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit(onCreate)}
                className="space-y-4"
              >
                <FieldGroup>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="mg-name">Account Name</FieldLabel>
                        <Input
                          {...field}
                          id="mg-name"
                          placeholder="Production"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="apiKey"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="mg-key">API Key</FieldLabel>
                        <Input
                          {...field}
                          id="mg-key"
                          placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxx"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="domain"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="mg-domain">Domain</FieldLabel>
                        <Input
                          {...field}
                          id="mg-domain"
                          placeholder="mg.example.com"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="fromEmail"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="mg-from">From Email</FieldLabel>
                        <Input
                          {...field}
                          id="mg-from"
                          placeholder="noreply"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </FieldGroup>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Verifying…" : "Add Account"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageBody>
    </>
  )
}

// Mailgun only adds the unsubscribe link and one-click header when this is on.
function UnsubscribeStatus({ id }: { id: string }) {
  const utils = trpc.useUtils()
  const { data } = trpc.mailgun.unsubscribeTracking.useQuery({ id })
  const enable = trpc.mailgun.enableUnsubscribeTracking.useMutation({
    onSuccess: () => utils.mailgun.unsubscribeTracking.invalidate({ id }),
  })

  const dot = (cls: string, text: string) => (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("size-1.5 rounded-full", cls)} />
      {text}
    </span>
  )
  if (!data) return dot("bg-muted-foreground", "Checking…")
  if (data.active === null) return dot("bg-muted-foreground", "Can't check")
  if (data.active) return dot("bg-success", "On")
  return (
    <div className="flex items-center gap-2">
      {dot("bg-destructive", "Off")}
      <Button
        size="xs"
        variant="outline"
        disabled={enable.isPending}
        onClick={() => enable.mutate({ id })}
      >
        {enable.isPending ? "Turning on…" : "Turn on"}
      </Button>
      {enable.error && (
        <p className="text-destructive">{enable.error.message}</p>
      )}
    </div>
  )
}
