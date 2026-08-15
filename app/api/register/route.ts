import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const data = registerSchema.parse(await request.json());
    await connectToDatabase();
    const exists = await User.exists({ email: data.email });
    if (exists) return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });

    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 12),
      role: "CITIZEN",
    });
    return NextResponse.json({ id: user._id.toString(), message: "Account created. You can now sign in." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
