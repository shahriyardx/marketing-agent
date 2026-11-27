"use client"

import { useEffect, useState } from "react"
import {
  DownloadIcon,
  EllipsisIcon,
  ListPlusIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"

import {
  BLOCKED_FILTERS,
  type ContactStatus,
  STATUS_TABS,
} from "@/lib/contact-filter"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { PageBody, PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ContactPanel } from "./contact-panel"
import {
  AddToListDialog,
  type Audience,
  ConfirmDialog,
  EditContactDialog,
  ImportDialog,
  SendDialog,
} from "./dialogs"
import { contactStatus, timeAgo } from "./status"

const PAGE_SIZE = 50

type Row = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
}

export default function ContactsPage() {
  const utils = trpc.useUtils()

  // ---- filters
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState<ContactStatus>("all")
  // "all" | "none" | "sent" | campaign id (ever received it)
  const [campaignFilter, setCampaignFilter] = useState("all")
  const [listId, setListId] = useState("")
  const [page, setPage] = useState(0)

  // ---- selection + panels
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    label: string
    run: () => void
  } | null>(null)
  const [sendAudience, setSendAudience] = useState<Audience | null>(null)
  const [listAudience, setListAudience] = useState<Audience | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // New query -> back to the first page, selection no longer applies.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on filter change
  useEffect(() => {
    setPage(0)
    setSelectedIds([])
  }, [debouncedSearch, campaignFilter, listId, status])

  // The Lists page links here with ?list=<id>
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("list")
    if (fromUrl) setListId(fromUrl)
  }, [])

  const filter = {
    search: debouncedSearch,
    campaignFilter,
    listId: listId || null,
    status,
  }
  const { data, isPending } = trpc.contacts.list.useQuery(
    { ...filter, page, pageSize: PAGE_SIZE },
    { placeholderData: (prev) => prev },
  )
  const { data: counts } = trpc.contacts.statusCounts.useQuery(
    { search: debouncedSearch, campaignFilter, listId: listId || null },
    { placeholderData: (prev) => prev },
  )
  const { data: lists = [] } = trpc.lists.getAll.useQuery()
  const { data: campaigns = [] } = trpc.campaigns.getAll.useQuery()

  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isBlocked = status in BLOCKED_FILTERS
  const hasFilters = !!debouncedSearch || campaignFilter !== "all" || !!listId
  const everyone = counts?.all ?? 0

  const sync = trpc.contacts.syncBlocked.useMutation({
    onSuccess: () => utils.contacts.invalidate(),
  })
  const del = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      setDeleteTarget(null)
      setActiveId(null)
      utils.contacts.invalidate()
    },
  })
  const delMany = trpc.contacts.deleteMany.useMutation({
    onSuccess: () => {
      setDeleteTarget(null)
      setSelectedIds([])
      utils.contacts.invalidate()
    },
  })
  const removeFromList = trpc.lists.removeContacts.useMutation({
    onSuccess: () => {
      setSelectedIds([])
      utils.lists.getAll.invalidate()
      utils.contacts.invalidate()
    },
  })

  const plural = (n: number) =>
    `${n.toLocaleString()} contact${n === 1 ? "" : "s"}`
  const selection: Audience = {
    label: plural(selectedIds.length),
    contactIds: selectedIds,
  }
  const allMatching: Audience = {
    label: `all ${plural(total)} shown`,
    filter,
  }
  const one = (c: Row): Audience => ({
    label: `${c.firstName} ${c.lastName}`,
    contactIds: [c.id],
  })

  async function exportCsv() {
    const cell = (v: string) =>
      /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const line = (c: Row & { createdAt: Date | string }) =>
      `${[
        c.firstName,
        c.lastName,
        c.email,
        c.phone ?? "",
        new Date(c.createdAt).toLocaleDateString(),
      ]
        .map(cell)
        .join(",")}\n`
    const parts = ["﻿First Name,Last Name,Email,Phone,Date\n"]
    if (selectedIds.length > 0) {
      for (const c of rows) if (selectedIds.includes(c.id)) parts.push(line(c))
    } else {
      for (let p = 0; ; p++) {
        const res = await utils.client.contacts.list.query({
          ...filter,
          page: p,
          pageSize: 5000,
        })
        for (const c of res.items) parts.push(line(c))
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

  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selectedIds.includes(r.id))
  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )

  const syncLabel = sync.data
    ? sync.data.errors.length
      ? `Couldn't read: ${sync.data.errors.join("; ")}`
      : `Synced · ${sync.data.marked.unsubscribed + sync.data.marked.bounced + sync.data.marked.complained} newly blocked`
    : sync.error?.message

  return (
    <>
      <PageHeader title="Contacts" count={everyone}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
            >
              <RefreshCwIcon className={cn(sync.isPending && "animate-spin")} />
              {sync.isPending ? "Syncing…" : "Sync Mailgun"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {syncLabel ?? "Sync unsubscribes, bounces and spam from Mailgun"}
          </TooltipContent>
        </Tooltip>
        <Button variant="outline" onClick={exportCsv}>
          <DownloadIcon />
          Export
        </Button>
        <Button onClick={() => setImportOpen(true)}>
          <PlusIcon />
          Import
        </Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1">
        <PageBody className="min-w-0 flex-1">
          {!isPending && everyone === 0 && !hasFilters ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <UploadIcon className="size-6 text-muted-foreground" />
              <h2 className="font-heading text-base font-semibold">
                No contacts yet
              </h2>
              <p className="max-w-sm text-muted-foreground">
                Import a CSV or Excel file, or connect your website forms from
                API &amp; WordPress.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setImportOpen(true)}>
                  Import contacts
                </Button>
                <Button variant="outline" asChild>
                  <a href="/dashboard/api-keys">Connect a website</a>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                role="tablist"
                aria-label="Status"
                className="flex gap-0.5 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]"
              >
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={status === t.value}
                    onClick={() => setStatus(t.value)}
                    className={cn(
                      "flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 font-medium whitespace-nowrap text-muted-foreground hover:text-foreground",
                      status === t.value && "border-primary text-foreground",
                    )}
                  >
                    {t.label}
                    <span className="rounded bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground">
                      {(counts?.[t.value] ?? 0).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-[300px]">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    aria-label="Search contacts"
                    placeholder="Search contacts"
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={listId || "all"}
                  onValueChange={(v) => setListId(v === "all" ? "" : v)}
                >
                  <SelectTrigger aria-label="List">
                    <span className="text-muted-foreground">List</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {lists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={campaignFilter}
                  onValueChange={setCampaignFilter}
                >
                  <SelectTrigger aria-label="Campaign">
                    <span className="text-muted-foreground">Campaign</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="none">Never sent one</SelectItem>
                    <SelectItem value="sent">Got at least one</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        Got {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="ml-auto flex items-center gap-2">
                  {selectedIds.length > 0 ? (
                    <>
                      <span className="text-muted-foreground">
                        {selectedIds.length.toLocaleString()} selected
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="More actions"
                          >
                            <EllipsisIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {listId && (
                            <DropdownMenuItem
                              onClick={() =>
                                removeFromList.mutate({
                                  listId,
                                  contactIds: selectedIds,
                                })
                              }
                            >
                              Remove from this list
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={exportCsv}>
                            <DownloadIcon />
                            Export selected
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              setDeleteTarget({
                                label: plural(selectedIds.length),
                                run: () => delMany.mutate({ ids: selectedIds }),
                              })
                            }
                          >
                            <Trash2Icon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="outline"
                        onClick={() => setListAudience(selection)}
                      >
                        <ListPlusIcon />
                        Add to list
                      </Button>
                      <Button
                        variant="accent"
                        onClick={() => setSendAudience(selection)}
                      >
                        <SendIcon />
                        Send campaign
                      </Button>
                    </>
                  ) : total > 0 && isBlocked ? (
                    <Button
                      variant="outline"
                      className="text-destructive"
                      onClick={() =>
                        setDeleteTarget({
                          label: plural(total),
                          run: () =>
                            delMany.mutate({
                              blocked: status as keyof typeof BLOCKED_FILTERS,
                              search: debouncedSearch,
                              campaignFilter,
                              listId: listId || null,
                            }),
                        })
                      }
                    >
                      <Trash2Icon />
                      Delete all {total.toLocaleString()}
                    </Button>
                  ) : total > 0 ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setListAudience(allMatching)}
                      >
                        <ListPlusIcon />
                        Add all to list
                      </Button>
                      <Button
                        variant="accent"
                        onClick={() => setSendAudience(allMatching)}
                      >
                        <SendIcon />
                        Send to all {total.toLocaleString()}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-[13px]">
                    <thead>
                      <tr className="border-b text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                        <th className="w-10 py-2.5 pl-3.5 font-medium">
                          <input
                            type="checkbox"
                            aria-label="Select all on this page"
                            className="size-3.5 accent-primary"
                            checked={allOnPageSelected}
                            onChange={() =>
                              setSelectedIds(
                                allOnPageSelected ? [] : rows.map((r) => r.id),
                              )
                            }
                          />
                        </th>
                        <th className="px-3 py-2.5 font-medium">Name</th>
                        <th className="px-3 py-2.5 font-medium">Email</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 font-medium">
                          Last campaign
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium">
                          Added
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-12 text-center text-muted-foreground"
                          >
                            No contacts match these filters.
                          </td>
                        </tr>
                      )}
                      {rows.map((c) => {
                        const s = contactStatus(c)
                        const active = activeId === c.id
                        return (
                          <tr
                            key={c.id}
                            onClick={() => setActiveId(active ? null : c.id)}
                            className={cn(
                              "cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/50",
                              active && "bg-accent hover:bg-accent",
                            )}
                          >
                            <td className="py-2.5 pl-3.5">
                              <input
                                type="checkbox"
                                aria-label={`Select ${c.firstName} ${c.lastName}`}
                                className="size-3.5 accent-primary"
                                checked={selectedIds.includes(c.id)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggle(c.id)}
                              />
                            </td>
                            <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                              <button
                                type="button"
                                className="text-left outline-none focus-visible:underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveId(active ? null : c.id)
                                }}
                              >
                                {c.firstName} {c.lastName}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
                              {c.email}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span
                                  className={cn("size-1.5 rounded-full", s.dot)}
                                />
                                {s.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                              {c.lastCampaignSent ? (
                                <span className="inline-flex items-center gap-2 text-foreground/85">
                                  <span
                                    className="size-2 rounded-[2px]"
                                    style={{
                                      backgroundColor: c.lastCampaignSent.color,
                                    }}
                                  />
                                  {c.lastCampaignSent.name}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap text-muted-foreground">
                              {timeAgo(c.createdAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-3 border-t px-3.5 py-2.5 text-xs text-muted-foreground">
                  <span>
                    {total === 0
                      ? "0"
                      : `${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min(
                          (page + 1) * PAGE_SIZE,
                          total,
                        ).toLocaleString()}`}{" "}
                    of {total.toLocaleString()}
                  </span>
                  <div className="ml-auto flex gap-1.5">
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
              </div>
            </>
          )}
        </PageBody>

        {activeId && (
          <ContactPanel
            id={activeId}
            onClose={() => setActiveId(null)}
            onEdit={() => {
              const c = rows.find((r) => r.id === activeId)
              if (c) setEditTarget(c)
            }}
            onDelete={() => {
              const c = rows.find((r) => r.id === activeId)
              if (c)
                setDeleteTarget({
                  label: `${c.firstName} ${c.lastName}`,
                  run: () => del.mutate({ id: c.id }),
                })
            }}
            onAddToList={() => {
              const c = rows.find((r) => r.id === activeId)
              if (c) setListAudience(one(c))
            }}
            onSend={() => {
              const c = rows.find((r) => r.id === activeId)
              if (c) setSendAudience(one(c))
            }}
          />
        )}
      </div>

      <EditContactDialog
        contact={editTarget}
        onClose={() => setEditTarget(null)}
      />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <SendDialog
        audience={sendAudience}
        onClose={() => setSendAudience(null)}
        onSent={() => {
          setSendAudience(null)
          setSelectedIds([])
        }}
      />
      <AddToListDialog
        audience={listAudience}
        onClose={() => setListAudience(null)}
        onAdded={() => {
          setListAudience(null)
          setSelectedIds([])
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete contacts"
        action="Delete"
        pending={del.isPending || delMany.isPending}
        onConfirm={() => deleteTarget?.run()}
        onClose={() => setDeleteTarget(null)}
      >
        Delete{" "}
        <span className="font-medium text-foreground">
          {deleteTarget?.label}
        </span>{" "}
        and their send history? This can&apos;t be undone.
      </ConfirmDialog>
    </>
  )
}
