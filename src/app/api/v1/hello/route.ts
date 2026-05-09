import { NextResponse } from "next/server"
import { validateApiRequest } from "@/lib/api-auth"

export async function GET(request: Request) {
  const { valid, error } = await validateApiRequest(request)
  if (!valid) {
    return NextResponse.json({ error }, { status: 401 })
  }

  return NextResponse.json({ message: "Hello from the API v1" })
}
