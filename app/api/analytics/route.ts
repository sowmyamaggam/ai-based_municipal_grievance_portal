import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { getAdminAnalytics } from "@/lib/admin-analytics";

export async function GET() {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  try {
    return NextResponse.json(await getAdminAnalytics());
  } catch (error) {
    console.error("Failed to load admin analytics.", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
