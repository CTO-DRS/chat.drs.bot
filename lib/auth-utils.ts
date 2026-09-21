/**
 * NextAuth only prefixes its session cookie with "__Secure-" when the
 * deployment URL is HTTPS. Reading the token must mirror that decision —
 * deriving it from the actual request protocol instead of NODE_ENV keeps
 * production deployments served over plain HTTP (e.g. Docker behind a TLS
 * proxy) working without an infinite guest-auth redirect loop.
 */
export function shouldUseSecureCookies(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https";
  }

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}
