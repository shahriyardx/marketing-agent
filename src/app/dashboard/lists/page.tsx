"use client"

import { useState } from "react"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { PageBody, PageHeader } from "@/components/page-header"
import { trpc } from "@/lib/trpc/client"
import { timeAgo } from "../contacts/status"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function ListsPage() {
  // null = closed; id null = creating a new list
  const [nameTarget, setNameTarget] = useState<{
    id: string | null
    name: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data: lists = [], isPending } = trpc.lists.getAll.useQuery()
  const done = () => {
    setNameTarget(null)
    setDeleteTarget(null)
    utils.lists.getAll.invalidate()
  }
  const create = trpc.lists.create.useMutation({ onSuccess: done })
  const rename = trpc.lists.rename.useMutation({ onSuccess: done })
  const remove = trpc.lists.delete.useMutation({ onSuccess: done })
  const saving = create.isPending || rename.isPending

  function save() {
    if (!nameTarget?.name.trim()) return
    if (nameTarget.id)
      rename.mutate({ id: nameTarget.id, name: nameTarget.name })
    else create.mutate({ name: nameTarget.name })
  }

  return (
    <>
      <PageHeader title="Lists">
        <Button onClick={() => setNameTarget({ id: null, name: "" })}>
          <PlusIcon />
          New List
        </Button>
      </PageHeader>
      <PageBody>
        {!isPending && lists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <h2 className="font-heading text-base font-semibold">
              No lists yet
            </h2>
            <p className="max-w-sm text-muted-foreground">
              Group contacts to send a campaign to just them. Create a list
              here, or tick contacts and choose Add to list.
            </p>
            <Button onClick={() => setNameTarget({ id: null, name: "" })}>
              <PlusIcon />
              New list
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">
                      <a
                        href={`/dashboard/contacts?list=${list.id}`}
                        className="hover:underline"
                      >
                        {list.name}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {list._count.members.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {timeAgo(list.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="outline" size="xs">
                          <a href={`/dashboard/contacts?list=${list.id}`}>
                            Open
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Rename"
                          onClick={() =>
                            setNameTarget({ id: list.id, name: list.name })
                          }
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-destructive"
                          aria-label="Delete"
                          onClick={() =>
                            setDeleteTarget({ id: list.id, name: list.name })
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

        <Dialog
          open={!!nameTarget}
          onOpenChange={(v) => {
            if (!v) setNameTarget(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {nameTarget?.id ? "Rename List" : "New List"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                save()
              }}
              className="space-y-4"
            >
              <Input
                autoFocus
                placeholder="List name, e.g. UK leads"
                value={nameTarget?.name ?? ""}
                onChange={(e) =>
                  setNameTarget((prev) =>
                    prev ? { ...prev, name: e.target.value } : null,
                  )
                }
              />
              {(create.error || rename.error) && (
                <p className="text-xs text-destructive">
                  {(create.error ?? rename.error)?.message}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNameTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !nameTarget?.name.trim()}
                >
                  {saving ? "Saving…" : "Save"}
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
              <DialogTitle>Delete List</DialogTitle>
              <DialogDescription>
                Delete{" "}
                <span className="font-medium text-foreground">
                  {deleteTarget?.name}
                </span>
                ? The contacts in it are not deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() =>
                  deleteTarget && remove.mutate({ id: deleteTarget.id })
                }
              >
                {remove.isPending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageBody>
    </>
  )
}
