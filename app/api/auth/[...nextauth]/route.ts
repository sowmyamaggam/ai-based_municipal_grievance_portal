import { handlers } from "@/auth";
import { rateLimit } from "@/lib/request-security";
import type { NextRequest } from "next/server";

export const GET = handlers.GET;

// Auth.js still performs its own CSRF validation. This lightweight limit
// reduces credential-stuffing attempts before they reach password checks.
export async function POST(request: NextRequest) {
  const limitError = rateLimit(request, "auth", 30, 15 * 60 * 1000);
  if (limitError) return limitError;
  return handlers.POST(request);
}
