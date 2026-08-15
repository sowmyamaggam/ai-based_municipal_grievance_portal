"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) setError(payload.error || "Unable to create account");
    else setDone(true);
  }

  return <main className="grid min-h-screen place-items-center bg-slate-50 p-5"><div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-10"><Link href="/" className="flex items-center gap-3 font-extrabold tracking-tight"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-600 text-white"><Building2 size={21} /></span><span className="text-sm leading-tight sm:text-lg">AI-based Municipal Grievance Portal</span></Link>{done ? <div className="py-14 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-civic-600" /><h1 className="mt-5 text-2xl font-extrabold">Your account is ready</h1><p className="mt-2 text-slate-600">Sign in to submit and track municipal reports.</p><Link href="/login" className="mt-7 inline-flex rounded-xl bg-civic-600 px-5 py-3 font-semibold text-white">Continue to sign in</Link></div> : <><h1 className="mt-9 text-3xl font-extrabold tracking-tight text-ink">Create your citizen account</h1><p className="mt-2 text-slate-600">Your details are used only to keep you informed about your reports.</p><form className="mt-7 space-y-4" onSubmit={submit}><Field label="Full name"><Input value={form.name} onChange={update("name")} required autoComplete="name" /></Field><Field label="Email address"><Input type="email" value={form.email} onChange={update("email")} required autoComplete="email" /></Field><Field label="Mobile number (optional)"><Input type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" /></Field><Field label="Password"><Input type="password" value={form.password} onChange={update("password")} required minLength={8} autoComplete="new-password" /></Field>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Button className="mt-2 w-full" type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button></form><p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link href="/login" className="font-bold text-civic-700 hover:underline">Sign in</Link></p></>}</div></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700"><span>{label}</span><div className="mt-1.5">{children}</div></label>;
}
