import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  await connectToDatabase();
  const officers = await User.find({ role: "OFFICER", active: true }).select("name phone department").sort({ name: 1 }).lean();
  return NextResponse.json({ officers });
}
