import { NextResponse } from "next/server"
import { z } from "zod"
import { validateApiRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
})

export async function POST(request: Request) {
  const { valid, error } = await validateApiRequest(request)
  if (!valid) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = await request.json()
  const result = schema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const contact = await prisma.contact.create({
    data: result.data,
  })

  return NextResponse.json(contact)
}
