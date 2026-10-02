import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { departmentSchema } from "@/lib/validation";
import { Department } from "@/models/Department";
import { requireSameOrigin, rateLimit } from "@/lib/request-security";

export async function GET() {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  await connectToDatabase();
  const departments = await Department.find({}).sort({ name: 1 }).lean();
  return NextResponse.json({ departments });
}

export async function POST(request: Request) {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const limitError = rateLimit(request, "departments", 30, 15 * 60 * 1000);
  if (limitError) return limitError;
  try {
    const data = departmentSchema.parse(await request.json());
    await connectToDatabase();
    const exists = await Department.exists({ name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (exists) return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 });
    const department = await Department.create(data);
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unable to create the department. Check the details and try again." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const body = await request.json();
    if (!/^[a-fA-F0-9]{24}$/.test(body.id || "")) return NextResponse.json({ error: "A valid department ID is required" }, { status: 400 });
    const data = departmentSchema.parse({ name: body.name, categories: body.categories, active: body.active });
    await connectToDatabase();
    const department = await Department.findByIdAndUpdate(body.id, data, { new: true });
    if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    return NextResponse.json({ department });
  } catch (error) {
    return NextResponse.json({ error: "Unable to update the department. Check the details and try again." }, { status: 400 });
  }
}
