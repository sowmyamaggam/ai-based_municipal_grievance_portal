import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { profileSchema } from "@/lib/validation";
import { User } from "@/models/User";

function publicProfile(user: { _id: { toString(): string }; name: string; email?: string; phone: string; role: string; department?: string | null }) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    department: user.department || "",
  };
}

export async function GET() {
  const access = await requireUser();
  if ("error" in access) return access.error;
  try {
    await connectToDatabase();
    const user = await User.findById(access.user.id).select("name email phone role department").lean();
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ profile: publicProfile(user) });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const access = await requireUser();
  if ("error" in access) return access.error;
  try {
    const data = profileSchema.parse(await request.json());
    await connectToDatabase();
    const user = await User.findByIdAndUpdate(
      access.user.id,
      { $set: { name: data.name } },
      { new: true }
    ).select("name email phone role department").lean();
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ profile: publicProfile(user), message: "Profile updated. Your name in the navigation will refresh after your next sign-in." });
  } catch (error) {
    return NextResponse.json({ error: "Unable to update your profile. Check the details and try again." }, { status: 400 });
  }
}
