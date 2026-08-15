import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardHome } from "@/components/dashboard-home";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");
  if (session.user.role === "OFFICER") redirect("/officer");
  let complaints: never[] | Awaited<ReturnType<typeof Complaint.find>> = []; let setupError: string | undefined;
  try { await connectToDatabase(); complaints = await Complaint.find(session.user.role === "CITIZEN" ? { citizen: session.user.id } : { assignedOfficer: session.user.id }).sort({ createdAt: -1 }).limit(100).lean() as never; } catch (error) { setupError = error instanceof Error ? error.message : "Could not connect to MongoDB."; }
  const list = complaints as unknown as { status: string; priority: string }[];
  return <DashboardShell user={{ name: session.user.name ?? "Portal user", role: session.user.role }}><DashboardHome user={{ name: session.user.name ?? "Portal user", role: session.user.role }} complaints={complaints as never} stats={{ total: list.length, active: list.filter((item) => !["RESOLVED", "CLOSED", "REJECTED"].includes(item.status)).length, resolved: list.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status)).length, critical: list.filter((item) => item.priority === "CRITICAL").length }} setupError={setupError} /></DashboardShell>;
}
