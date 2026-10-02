import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { requireSameOrigin } from "@/lib/request-security";

export async function GET() {
  const access = await requireUser();
  if ("error" in access) return access.error;
  try {
    await connectToDatabase();
    const notifications = await Notification.find({ user: access.user.id }).sort({ createdAt: -1 }).limit(30).lean();
    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const access = await requireUser();
  if ("error" in access) return access.error;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  await connectToDatabase();
  await Notification.updateMany({ user: access.user.id, readAt: null }, { readAt: new Date() });
  return NextResponse.json({ ok: true });
}
