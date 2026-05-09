import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/v1")) {
    return NextResponse.next()
  }

  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Bearer <api_key>" },
      { status: 401 },
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/v1/:path*",
}
