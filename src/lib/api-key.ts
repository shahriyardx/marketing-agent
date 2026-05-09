import { createHash, randomBytes } from "node:crypto"

export function generateApiKey(): {
  raw: string
  prefix: string
  hash: string
} {
  const raw = `ma_${randomBytes(32).toString("hex")}`
  const prefix = raw.slice(0, 11)
  const hash = createHash("sha256").update(raw).digest("hex")
  return { raw, prefix, hash }
}

export function verifyApiKey(raw: string, hash: string): boolean {
  const computed = createHash("sha256").update(raw).digest("hex")
  return computed === hash
}
