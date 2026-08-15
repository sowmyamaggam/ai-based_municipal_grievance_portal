import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { OfficerManagement } from "@/components/officer-management";

export default async function OfficerManagementPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return <DashboardShell user={{ name: session.user.name ?? "Administrator", role: session.user.role }}><section><p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">Municipal administration</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Officer and department management</h1><p className="mt-2 max-w-3xl text-slate-600">Create staff accounts, control access, and configure the routing that takes AI suggestions to the right municipal team.</p></section><div className="mt-7"><OfficerManagement /></div></DashboardShell>;
}
