import { crc32, deflateRawSync } from "node:zlib"
import type { NextRequest } from "next/server"
import {
  WORDPRESS_PLUGIN_SLUG,
  wordpressPluginPhp,
} from "@/lib/wordpress-plugin"

// Builds a WordPress-installable zip with this app's URL baked in as the default.
export function GET(request: NextRequest) {
  const php = wordpressPluginPhp(request.nextUrl.origin)
  const zip = makeZip([
    { name: `${WORDPRESS_PLUGIN_SLUG}/` },
    {
      name: `${WORDPRESS_PLUGIN_SLUG}/${WORDPRESS_PLUGIN_SLUG}.php`,
      data: Buffer.from(php),
    },
  ])

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${WORDPRESS_PLUGIN_SLUG}.zip"`,
      "Cache-Control": "no-store",
    },
  })
}

// Minimal zip writer (deflate, no zip64). Fine for a few small files.
function makeZip(entries: { name: string; data?: Buffer }[]) {
  const local: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  const now = new Date()
  const time =
    (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date =
    ((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate()

  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const raw = entry.data ?? Buffer.alloc(0)
    const isDir = !entry.data
    const body = isDir ? raw : deflateRawSync(raw)
    const crc = isDir ? 0 : crc32(raw)
    const method = isDir ? 0 : 8

    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(0x0800, 6) // UTF-8 names
    header.writeUInt16LE(method, 8)
    header.writeUInt16LE(time, 10)
    header.writeUInt16LE(date, 12)
    header.writeUInt32LE(crc, 14)
    header.writeUInt32LE(body.length, 18)
    header.writeUInt32LE(raw.length, 22)
    header.writeUInt16LE(name.length, 26)
    header.writeUInt16LE(0, 28)
    local.push(header, name, body)

    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50, 0)
    dir.writeUInt16LE(20, 4)
    dir.writeUInt16LE(20, 6)
    dir.writeUInt16LE(0x0800, 8)
    dir.writeUInt16LE(method, 10)
    dir.writeUInt16LE(time, 12)
    dir.writeUInt16LE(date, 14)
    dir.writeUInt32LE(crc, 16)
    dir.writeUInt32LE(body.length, 20)
    dir.writeUInt32LE(raw.length, 24)
    dir.writeUInt16LE(name.length, 28)
    dir.writeUInt32LE(isDir ? 0x10 : 0, 38) // MS-DOS directory flag
    dir.writeUInt32LE(offset, 42)
    central.push(dir, name)

    offset += header.length + name.length + body.length
  }

  const centralBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...local, centralBuf, end])
}
