import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

// This is deliberately a bounded best-effort limiter for a single Node
// instance. Deployments with multiple instances should set RATE_LIMIT_STORE to
// a shared implementation; callers still get immediate protection locally.
const buckets = new Map<string, Bucket>();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  // Avoid keeping obsolete client keys alive in a long-running development
  // server. This stays O(1) for normal requests.
  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  }

  if (bucket.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/** Require browser state changes to originate from this application. */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Non-browser server-to-server calls have no Origin header. Auth.js has its
  // own CSRF protection; application routes also validate the session/body.
  if (!origin) return null;
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

export function publicError(status = 500) {
  return NextResponse.json(
    { error: status >= 500 ? "Something went wrong. Please try again." : "Unable to process this request." },
    { status }
  );
}
