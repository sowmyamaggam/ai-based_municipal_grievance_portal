import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdminAnalyticsContent } from "./analytics-content";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <DashboardShell user={{ name: session.user.name ?? "Administrator", role: session.user.role }}>
      <section>
        <p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">
          City operations
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
          Municipal intelligence overview
        </h1>
        <p className="mt-2 text-slate-600">
          Live reporting trends, service outcomes, and recurring issue areas.
        </p>
      </section>
      <div className="mt-7">
        <Suspense fallback={<div className="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500" aria-live="polite">Loading city analytics...</div>}>
          <AdminAnalyticsContent />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
