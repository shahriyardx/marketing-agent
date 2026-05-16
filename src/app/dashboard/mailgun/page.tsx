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
  })
  const updateMutation = trpc.mailgun.update.useMutation({
    onSuccess: () => {
      setEditTarget(null)
      form.reset()
      utils.mailgun.getAll.invalidate()
    },
  })
  const toggleMutation = trpc.mailgun.toggle.useMutation({
    onSuccess: () => utils.mailgun.getAll.invalidate(),
  })
  const deleteMutation = trpc.mailgun.delete.useMutation({
    onSuccess: () => utils.mailgun.getAll.invalidate(),
  })

  const validateMutation = trpc.mailgun.validate.useMutation()

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

    try {
      await validateMutation.mutateAsync({ apiKey: values.apiKey.trim() })
    } catch {
      form.setError("apiKey", { message: "API key rejected by Mailgun" })
      return
    }

    createMutation.mutate({ ...values, apiKey: values.apiKey.trim() })
  }

  async function onEdit(values: FormValues) {
    if (!editTarget) return
    if (!validateApiKey(true)) return

    const trimmedKey = values.apiKey.trim()

    if (trimmedKey) {
      try {
        await validateMutation.mutateAsync({ apiKey: trimmedKey })
      } catch {
        form.setError("apiKey", { message: "API key rejected by Mailgun" })
        return
      }
    }

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
    form.reset({ name: account.name, apiKey: "", domain: account.domain, fromEmail: account.fromEmail })
  }

  function openCreate() {
    setCreateOpen(true)
    form.reset({ name: "", apiKey: "", domain: "", fromEmail: "noreply" })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Mailgun Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your Mailgun API keys for campaign delivery.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card
            key={account.id}
            className={cn(!account.enabled && "opacity-50")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={cn(
                  "text-xs font-medium",
                  !account.enabled && "text-muted-foreground",
                )}
              >
                {account.name}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Switch
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
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => openEdit(account)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={() =>
                    setDeleteTarget({ id: account.id, name: account.name })
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="truncate font-mono">{account.apiKey}</p>
                <p>{account.domain}</p>
                <p>{account.sentCount} emails sent</p>
              </div>
            </CardContent>
          </Card>
        ))}

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
              <Button variant="outline" onClick={() => setDisableTarget(null)}>
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
                      <FieldLabel htmlFor="edit-name">Account Name</FieldLabel>
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
                      <FieldLabel htmlFor="edit-from">
                        From Email
                      </FieldLabel>
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
                <Button type="submit" disabled={updateMutation.isPending || validateMutation.isPending}>
                  {validateMutation.isPending
                    ? "Validating…"
                    : updateMutation.isPending
                      ? "Saving…"
                      : "Save Changes"}
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
          <DialogTrigger asChild>
            <Card
              className="flex cursor-pointer items-center justify-center border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 hover:text-primary dark:bg-muted/10 dark:hover:bg-muted/20"
              onClick={openCreate}
            >
              <div className="flex flex-col items-center gap-2">
                <PlusIcon className="size-5" />
                <span className="text-xs font-medium">Add Mailgun Account</span>
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Mailgun Account</DialogTitle>
              <DialogDescription>
                Enter your Mailgun API credentials to enable campaign delivery.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
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
                      <FieldLabel htmlFor="mg-from">
                        From Email
                      </FieldLabel>
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
                <Button type="submit" disabled={createMutation.isPending || validateMutation.isPending}>
                  {validateMutation.isPending
                    ? "Validating…"
                    : createMutation.isPending
                      ? "Adding…"
                      : "Add Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
