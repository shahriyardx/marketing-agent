import { prisma } from "@/lib/prisma"
import { verifyApiKey } from "@/lib/api-key"

export async function validateApiRequest(
  request: Request,
): Promise<{ valid: boolean; error?: string }> {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) {
    return {
      valid: false,
      error: "Missing Authorization header. Use: Bearer <api_key>",
    }
  }

  const key = header.slice(7)
  const prefix = key.slice(0, 11)

  const record = await prisma.apiKey.findFirst({
    where: {
      prefix,
      hash: { not: "" },
    },
  })

  if (!record || !verifyApiKey(key, record.hash)) {
    return { valid: false, error: "Invalid API key" }
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  })

  return { valid: true }
}
