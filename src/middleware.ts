import { NextResponse, type NextRequest } from "next/server";
import {
  isSameOriginApiRequest,
  shouldGuardApiRoutes,
} from "@/lib/security/api-guard";

export function middleware(request: NextRequest) {
  if (!shouldGuardApiRoutes()) {
    return NextResponse.next();
  }

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
    { error: "API routes require same-origin requests when GEMINI_API_KEY is configured." },
    { status: 403 },
  );
}

export const config = {
  matcher: "/api/:path*",
};
