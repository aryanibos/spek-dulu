import { NextResponse, type NextRequest } from "next/server";
import {
  isSameOriginApiRequest,
  shouldAlwaysGuardApiPath,
  shouldGuardApiRoutes,
} from "@/lib/security/api-guard";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const guardRequired =
    shouldGuardApiRoutes() || shouldAlwaysGuardApiPath(pathname);

  if (!guardRequired) {
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
    {
      error: shouldAlwaysGuardApiPath(pathname)
        ? "This API route requires same-origin requests."
        : "API routes require same-origin requests when GEMINI_API_KEY is configured.",
    },
    { status: 403 },
  );
}

export const config = {
  matcher: "/api/:path*",
};
