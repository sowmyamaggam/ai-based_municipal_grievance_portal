import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { connectToDatabase } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { User } from "@/models/User";
import { rateLimit, requireSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  let data;
  try {
    data = registerSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Check the details and try again." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to read the registration details. Please try again." }, { status: 400 });
  }

  const ipLimitError = rateLimit(request, "registration-ip", 20, 15 * 60 * 1000);
  if (ipLimitError) return ipLimitError;
  const emailLimitError = rateLimit(request, `registration-email:${data.email}`, 8, 15 * 60 * 1000);
  if (emailLimitError) return emailLimitError;

  try {
    await connectToDatabase();

    if (await User.exists({ $or: [{ email: data.email }, { phone: data.phone }] })) {
      if (await User.exists({ email: data.email })) {
        return NextResponse.json({ error: "This email address is already registered. Please sign in." }, { status: 409 });
      }
      return NextResponse.json({ error: "This mobile number is already registered. Please sign in." }, { status: 409 });
    }

    const user = await User.create({
      name: data.username,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 12),
      role: "CITIZEN",
    });

    return NextResponse.json({ id: user._id.toString(), message: "Account created successfully." }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      const key = "keyPattern" in error && error.keyPattern && typeof error.keyPattern === "object" && "email" in error.keyPattern ? "email address" : "mobile number";
      return NextResponse.json({ error: `This ${key} is already registered. Please sign in.` }, { status: 409 });
    }
    console.error("Citizen registration failed", error);
    return NextResponse.json({ error: "Account creation is temporarily unavailable. Please try again shortly." }, { status: 500 });
  }
}
