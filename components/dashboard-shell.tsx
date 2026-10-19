"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Building2, ClipboardList, LayoutDashboard, LogOut, Menu, Plus, UserRound, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { CivicAssistant } from "@/components/civic-assistant";
import { NotificationCenter } from "@/components/notification-center";

type Role = "CITIZEN" | "OFFICER" | "ADMIN";

const links = {
  CITIZEN: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/complaints", label: "My complaints", icon: ClipboardList }, { href: "/complaints/new", label: "Report an issue", icon: Plus }, { href: "/profile", label: "Profile", icon: UserRound }],
  OFFICER: [{ href: "/officer", label: "Work queue", icon: LayoutDashboard }, { href: "/complaints", label: "Assigned complaints", icon: ClipboardList }, { href: "/profile", label: "Profile", icon: UserRound }],
  ADMIN: [{ href: "/admin", label: "City overview", icon: LayoutDashboard }, { href: "/admin/officers", label: "Officer management", icon: UsersRound }, { href: "/complaints", label: "All complaints", icon: ClipboardList }, { href: "/profile", label: "Profile", icon: UserRound }],
} satisfies Record<Role, { href: string; label: string; icon: typeof LayoutDashboard }[]>;

export function DashboardShell({ children, user }: { children: React.ReactNode; user: { name: string; role: Role } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut({ redirect: false });
    window.location.assign(new URL("/", window.location.href));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className={cn("fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white p-5 transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-start justify-between gap-2">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 font-extrabold tracking-tight">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-600 text-white"><Building2 size={21} /></span>
            <span className="text-sm leading-tight">AI-based Municipal Grievance Portal</span>
          </Link>
          <button className="rounded-lg p-2 text-slate-500 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="mt-10 space-y-1">
          {links[user.role].map(({ href, label, icon: Icon }) => (
            <Link key={`${href}-${label}`} href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", pathname === href ? "bg-civic-50 text-civic-700" : "text-slate-600 hover:bg-slate-100 hover:text-ink")}>
              <Icon size={19} />{label}
            </Link>
          ))}
        </div>
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Signed in as</p>
          <p className="mt-1 truncate font-bold text-ink">{user.name}</p>
          <p className="text-sm text-civic-700">{user.role.toLowerCase()}</p>
          <button onClick={handleSignOut} className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {open && <button aria-label="Close navigation overlay" className="fixed inset-0 z-20 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur sm:px-8">
          <button className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <div className="hidden lg:block"><p className="text-sm font-bold text-slate-500">AI-based Municipal Grievance Portal</p></div>
          <div className="flex items-center gap-3">
            <Link href="/complaints/new" className={cn(buttonClass("primary", "hidden sm:inline-flex"), user.role !== "CITIZEN" && "hidden")}><Plus size={17} /> New report</Link>
            <NotificationCenter />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 sm:p-8">{children}</main>
      </div>
      <CivicAssistant />
    </div>
  );
}
