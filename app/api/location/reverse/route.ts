import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authorization";

const coordinatesSchema = z.object({
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
});

const geocoderResponseSchema = z.object({
  display_name: z.string().trim().min(1).max(500),
});

// Converts an explicitly captured GPS point into a readable place name. The
// client still keeps the actual coordinates private for protected maps and
// duplicate detection; no location is collected until the citizen opts in.
export async function GET(request: Request) {
  const access = await requireUser();
  if ("error" in access) return access.error;

  const { searchParams } = new URL(request.url);
  const parsed = coordinatesSchema.safeParse({
    latitude: searchParams.get("latitude"),
    longitude: searchParams.get("longitude"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Valid GPS coordinates are required" }, { status: 400 });

  try {
    const { latitude, longitude } = parsed.data;
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=18&addressdetails=1`, {
      headers: { Accept: "application/json", "User-Agent": "AI-Based-Municipal-Grievance-Portal/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("Place-name lookup is unavailable");
    const result = geocoderResponseSchema.safeParse(await response.json());
    if (!result.success) throw new Error("No readable place name was returned");
    return NextResponse.json({ locationName: result.data.display_name });
  } catch {
    return NextResponse.json({ error: "We captured your GPS location, but could not look up its place name. You can still enter a landmark." }, { status: 502 });
  }
}
