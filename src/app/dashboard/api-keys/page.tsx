"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CopyIcon, PlusIcon } from "lucide-react"

import { trpc } from "@/lib/trpc/client"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
})

type FormValues = z.infer<typeof schema>

export default function ApiKeysPage() {
  const [open, setOpen] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data: keys = [] } = trpc.apiKeys.getAll.useQuery()
  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      form.reset()
      setNewKey(data.raw)
      utils.apiKeys.getAll.invalidate()
    },
  })
  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => utils.apiKeys.getAll.invalidate(),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })

  function onCreate(values: FormValues) {
    createMutation.mutate(values)
  }

  function handleClose() {
    setOpen(false)
    setNewKey(null)
    form.reset()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage keys for programmatic access to the API.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (!v) handleClose()
            else setOpen(true)
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <PlusIcon />
              New API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Give your key a name to identify it later.
              </DialogDescription>
            </DialogHeader>

            {newKey ? (
              <div className="space-y-4">
                <div className="rounded-none border border-primary/30 bg-primary/5 p-4">
                  <p className="mb-2 text-xs font-medium">
                    Copy your key now. You won&apos;t be able to see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded-none bg-muted px-2 py-1.5 font-mono text-xs">
                      {newKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => navigator.clipboard.writeText(newKey)}
                    >
                      <CopyIcon />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleClose}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
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
                        <FieldLabel htmlFor="key-name">Name</FieldLabel>
                        <Input
                          {...field}
                          id="key-name"
                          placeholder="Production API"
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
                    {createMutation.isPending ? "Creating…" : "Create Key"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-none border bg-muted/30 px-4 py-3">
        <p className="text-xs font-medium">Usage</p>
        <code className="mt-1 block text-xs text-muted-foreground">
          Authorization: Bearer &lt;api_key&gt;
        </code>
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
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

      {keys.length === 0 ? (
        <div className="rounded-none border p-8 text-center text-sm text-muted-foreground">
          No API keys yet. Create one to get started.
        </div>
      ) : (
        <div className="rounded-none border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {key.prefix}…
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        setDeleteTarget({ id: key.id, name: key.name })
                      }
                    >
                      Delete
                    </Button>
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
