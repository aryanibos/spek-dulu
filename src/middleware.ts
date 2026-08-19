import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginApiRequest } from "@/lib/security/api-guard";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (request.method !== "POST") {
    return NextResponse.next();
  }

  if (isSameOriginApiRequest(request)) {
    return NextResponse.next();
  }

  return NextResponse.json(
    { error: "This API route requires same-origin requests." },
    { status: 403 },
  );
}

export const config = {
  matcher: "/api/:path*",
};
