import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { managedUserSchema, officerSchema } from "@/lib/validation";
import { User } from "@/models/User";

export async function GET() {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  try {
    await connectToDatabase();
    const users = await User.find({}).select("name email role phone department active createdAt updatedAt").sort({ role: 1, name: 1 }).lean();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  try {
    const data = officerSchema.parse(await request.json());
    await connectToDatabase();
    if (await User.exists({ email: data.email })) return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    const officer = await User.create({ name: data.name, email: data.email, phone: data.phone, department: data.department, passwordHash: await bcrypt.hash(data.password, 12), role: "OFFICER", active: true });
    return NextResponse.json({ officer: { _id: officer._id.toString(), id: officer._id.toString(), name: officer.name, email: officer.email, department: officer.department, role: officer.role, active: officer.active }, message: "Officer account created." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create officer account" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[a-fA-F0-9]{24}$/.test(id)) return NextResponse.json({ error: "A valid user ID is required" }, { status: 400 });
    const data = managedUserSchema.parse(body);
    await connectToDatabase();
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user._id.toString() === access.user.id && data.active === false) return NextResponse.json({ error: "You cannot deactivate your own administrator account" }, { status: 400 });
    Object.assign(user, data);
    await user.save();
    return NextResponse.json({ user: { _id: user._id.toString(), id: user._id.toString(), name: user.name, email: user.email, department: user.department, role: user.role, active: user.active } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update user" }, { status: 400 });
  }
}
