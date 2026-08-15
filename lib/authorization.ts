import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { NextResponse } from "next/server";

export type Role = "CITIZEN" | "OFFICER" | "ADMIN";

export async function requireUser(roles?: Role[]) {
  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.id) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };

  await connectToDatabase();
  const user = await User.findById(sessionUser.id).select("name email role active").lean();
  if (!user?.active) return { error: NextResponse.json({ error: "This account is no longer active. Please sign in again or contact an administrator." }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) return { error: NextResponse.json({ error: "You do not have access to this resource" }, { status: 403 }) };
  return { user: { id: user._id.toString(), role: user.role as Role, name: user.name ?? "Municipal user", email: user.email ?? "" } };
}

export function canManageComplaint(role: Role) {
  return role === "OFFICER" || role === "ADMIN";
}
