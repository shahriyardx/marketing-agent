import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export async function createContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return {
    session,
    prisma,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
