import { createWriteStream } from "node:fs"
import { stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { enqueueImport } from "@/lib/contact-import"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

// Raw file body (not multipart) so it streams straight to disk. The import
// itself runs in the background; poll the job via trpc `imports.list`.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const fileName = new URL(request.url).searchParams.get("name") ?? "contacts"
  const lower = fileName.toLowerCase()
  const isXlsx = lower.endsWith(".xlsx")
  if (!isXlsx && !lower.endsWith(".csv")) {
    return NextResponse.json(
      { error: "Only .csv and .xlsx files are supported" },
      { status: 400 },
    )
  }
  if (!request.body) {
    return NextResponse.json({ error: "Empty upload" }, { status: 400 })
  }

  const job = await prisma.importJob.create({ data: { fileName } })
  const path = join(tmpdir(), `import-${job.id}${isXlsx ? ".xlsx" : ".csv"}`)

  try {
    await pipeline(
      Readable.fromWeb(request.body as import("node:stream/web").ReadableStream),
      createWriteStream(path),
    )
    const { size } = await stat(path)
    await prisma.importJob.update({
      where: { id: job.id },
      data: { bytesTotal: size },
    })
  } catch {
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "failed", error: "Upload interrupted", finishedAt: new Date() },
    })
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  enqueueImport(job.id, path, isXlsx)
  return NextResponse.json({ jobId: job.id })
}
