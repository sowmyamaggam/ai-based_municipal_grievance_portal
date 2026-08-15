import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { NewComplaintForm } from "@/components/new-complaint-form";

export default async function NewComplaintPage() { const session = await auth(); if (!session?.user?.id || !session.user.role) redirect("/login"); if (session.user.role !== "CITIZEN") redirect("/dashboard"); return <DashboardShell user={{ name: session.user.name ?? "Citizen", role: session.user.role }}><section><p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">New municipal report</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Tell us what needs attention</h1><p className="mt-2 max-w-2xl text-slate-600">Your report is kept even if AI services are temporarily unavailable. Please avoid including sensitive personal information.</p></section><div className="mt-7"><NewComplaintForm /></div></DashboardShell>; }
