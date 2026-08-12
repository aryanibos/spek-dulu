import type { NextRequest } from "next/server";

/** Routes that fetch arbitrary public URLs — always require same-origin even in demo mode. */
const ALWAYS_GUARDED_API_PATHS = new Set([
  "/api/analyze-url",
  "/api/visual-design",
]);

export function shouldGuardApiRoutes(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function shouldAlwaysGuardApiPath(pathname: string): boolean {
  return ALWAYS_GUARDED_API_PATHS.has(pathname);
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
