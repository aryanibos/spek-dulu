import type { NextRequest } from "next/server";

export function shouldGuardApiRoutes(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function isSameOriginApiRequest(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin") {
    return true;
  }
  // Reject cross-site and same-site fetches; do not trust Origin/Referer alone
  // because non-browser clients can spoof them and abuse Gemini-backed routes.
  return false;
}
