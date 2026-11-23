import { createReadStream } from "node:fs"
import { unlink } from "node:fs/promises"
import { Readable } from "node:stream"
import { readCsvRows } from "@/lib/csv"
import { prisma } from "@/lib/prisma"

const BATCH = 2000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Columns = {
  first: number
  last: number
  name: number
  email: number
  phone: number
}

function findColumns(header: string[]): Columns | string {
  const h = header.map((v) => v.toLowerCase().trim())
  const idx = (...names: string[]) => h.findIndex((v) => names.includes(v))
  const cols = {
    first: idx("first name", "firstname"),
    last: idx("last name", "lastname"),
    name: idx("name", "full name"),
    email: idx("email"),
    phone: idx("phone"),
  }
  if (cols.email === -1) return 'File must have an "Email" column'
  if (cols.first === -1 && cols.name === -1)
    return 'File must have a "Name" or "First Name" column'
  return cols
}

function toContact(row: string[], cols: Columns) {
  const get = (i: number) => (i === -1 ? "" : (row[i] ?? "").trim())
  const email = get(cols.email).toLowerCase()
  if (!EMAIL_RE.test(email)) return null

  let firstName: string
  let lastName: string
  if (cols.first !== -1) {
    firstName = get(cols.first)
    lastName = get(cols.last)
  } else {
    const fullName = get(cols.name)
    const space = fullName.indexOf(" ")
    firstName = space === -1 ? fullName : fullName.slice(0, space)
    lastName = space === -1 ? "" : fullName.slice(space + 1)
  }
  if (!firstName) return null

  return { firstName, lastName, email, phone: get(cols.phone) || null }
}

function cellText(v: unknown): string {
  if (v && typeof v === "object") {
    if ("text" in v) return String((v as { text: unknown }).text)
    if ("result" in v) return String((v as { result: unknown }).result ?? "")
  }
  return String(v ?? "")
}

// Yields rows in batches without loading the whole file. `onBytes` reports
// read position where it is known (CSV only; xlsx has no cheap equivalent).
async function* readRows(
  path: string,
  isXlsx: boolean,
  onBytes: (n: number) => void,
): AsyncGenerator<string[][]> {
  if (!isXlsx) {
    const fileStream = createReadStream(path)
    fileStream.on("data", () => onBytes(fileStream.bytesRead))
    yield* readCsvRows(
      Readable.toWeb(fileStream) as ReadableStream<Uint8Array>,
      BATCH,
    )
    return
  }

  const { default: ExcelJS } = await import("exceljs")
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(path, {
    sharedStrings: "cache",
    hyperlinks: "ignore",
    styles: "ignore",
    worksheets: "emit",
  })

  let batch: string[][] = []
  for await (const sheet of reader) {
    for await (const row of sheet) {
      // exceljs row.values is 1-based (index 0 is empty)
      const vals = Array.from(row.values as unknown[]).slice(1)
      batch.push(vals.map(cellText))
      if (batch.length >= BATCH) {
        yield batch
        batch = []
      }
    }
    break // first worksheet only
  }
  if (batch.length > 0) yield batch
}

async function runJob(jobId: string, path: string, isXlsx: boolean) {
  const totals = { rows: 0, created: 0, duplicates: 0, invalid: 0 }
  let bytesRead = 0

  try {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: "running" },
    })

    let cols: Columns | null = null
    for await (const rows of readRows(path, isXlsx, (n) => {
      bytesRead = n
    })) {
      let dataRows = rows
      if (!cols) {
        const found = findColumns(rows[0])
        if (typeof found === "string") throw new Error(found)
        cols = found
        dataRows = rows.slice(1)
      }

      const byEmail = new Map<string, NonNullable<ReturnType<typeof toContact>>>()
      let batchInvalid = 0
      for (const row of dataRows) {
        const c = toContact(row, cols)
        if (c) byEmail.set(c.email, c)
        else batchInvalid++
      }

      const { count } = await prisma.contact.createMany({
        data: [...byEmail.values()],
        skipDuplicates: true,
      })

      totals.rows += dataRows.length
      totals.created += count
      totals.invalid += batchInvalid
      // valid rows that weren't new (repeated in the file or already stored)
      totals.duplicates += dataRows.length - batchInvalid - count
      await prisma.importJob.update({
        where: { id: jobId },
        data: { ...totals, bytesRead },
      })
    }

    if (!cols) throw new Error("File is empty")

    await prisma.importJob.update({
      where: { id: jobId },
      data: { ...totals, bytesRead, status: "done", finishedAt: new Date() },
    })
  } catch (e) {
    await prisma.importJob
      .update({
        where: { id: jobId },
        data: {
          ...totals,
          status: "failed",
          error: e instanceof Error ? e.message : "Import failed",
          finishedAt: new Date(),
        },
      })
      .catch(() => {})
  } finally {
    await unlink(path).catch(() => {})
  }
}

// One import at a time keeps a 2 vCPU box responsive.
let queue: Promise<unknown> = Promise.resolve()

export function enqueueImport(jobId: string, path: string, isXlsx: boolean) {
  queue = queue.then(() => runJob(jobId, path, isXlsx))
}
