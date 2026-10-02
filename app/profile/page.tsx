import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");

  await connectToDatabase();
  const profile = await User.findById(session.user.id).select("name email phone role department active").lean();
  if (!profile?.active) redirect("/login");

  return (
    <DashboardShell user={{ name: profile.name || "Portal user", role: profile.role }}>
      <section>
        <p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">Account settings</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Manage your profile</h1>
        <p className="mt-2 text-slate-600">Update the information connected to your portal account.</p>
      </section>
      <div className="mt-7"><ProfileForm profile={{ name: profile.name, email: profile.email || "", phone: profile.phone, role: profile.role, department: profile.department || undefined }} /></div>
    </DashboardShell>
  );
}
