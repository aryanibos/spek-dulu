import type { NextRequest } from "next/server";

export function shouldGuardApiRoutes(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function isSameOriginApiRequest(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin") {
    return true;
  }
  if (secFetchSite) {
    return false;
  }

  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return false;
}
