"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { AlertCircle, Building2, CheckCircle2, Loader2, LockKeyhole, Mail, Phone, UserRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emptyForm = { username: "", phone: "", email: "", password: "", confirmPassword: "" };

export default function RegisterPage() {
  const [form, setForm] = useState(emptyForm);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  async function register(event: React.FormEvent) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!/^\+?[1-9]\d{9,14}$/.test(form.phone.trim())) {
      setError("Enter a valid mobile number, including the country code where applicable.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: form.phone.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create your account.");

      setRegistered(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create your account.");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="flex items-center justify-center px-5 py-9 sm:px-10 lg:py-10">
        <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center gap-3 font-extrabold tracking-tight sm:mb-10">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-600 text-white">
            <Building2 size={21} />
          </span>
          <span className="text-sm leading-tight sm:text-lg">AI-based Municipal Grievance Portal</span>
        </Link>

        {registered ? (
          <div className="py-14 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-civic-600" />
            <h1 className="mt-5 text-2xl font-extrabold">Your account is ready</h1>
            <p className="mt-2 text-slate-600">Your account was created. Sign in with your email and password to submit and track municipal reports.</p>
            <Link href="/login" className="mt-7 inline-flex rounded-xl bg-civic-600 px-5 py-3 font-semibold text-white hover:bg-civic-700">Continue to sign in</Link>
          </div>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">Join your community</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">Create your citizen account</h1>
            <p className="mt-2 text-slate-600">Enter your details to create an account.</p>

            <form className="mt-6 space-y-4" onSubmit={register}>
              <Field label="Username" icon={<UserRound size={18} />}><Input className="pl-10" value={form.username} onChange={update("username")} required autoComplete="username" /></Field>
              <Field label="Mobile number" icon={<Phone size={18} />}><Input className="pl-10" type="tel" value={form.phone} onChange={update("phone")} required autoComplete="tel" placeholder="+91 XXXXXXXXX" /></Field>
              <Field label="Email address" icon={<Mail size={18} />}><Input className="pl-10" type="email" value={form.email} onChange={update("email")} required autoComplete="email" /></Field>
              <Field label="Password" icon={<LockKeyhole size={18} />}><Input className="pl-10" type="password" value={form.password} onChange={update("password")} required minLength={8} autoComplete="new-password" /></Field>
              <Field label="Confirm password" icon={<LockKeyhole size={18} />}><Input className="pl-10" type="password" value={form.confirmPassword} onChange={update("confirmPassword")} required minLength={8} autoComplete="new-password" /></Field>

              {error && <ErrorMessage message={error} />}

              <Button className="mt-2 w-full" type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : "Create account"}
              </Button>
            </form>
          </>
        )}

        {!registered && (
          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered? <Link href="/login" className="font-bold text-civic-700 hover:underline">Sign in</Link>
          </p>
        )}
        </div>
      </section>

      <aside className="relative hidden min-h-screen overflow-hidden bg-ink lg:block">
        <Image
          src="https://www.image2url.com/r2/default/images/1786601327650-eb649f61-d88a-42bf-b44e-969dae950d25.jpg"
          alt="Civic infrastructure and community"
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
        <div className="absolute bottom-0 p-12 text-white">
          <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur"><ShieldCheck /></span>
          <h2 className="max-w-lg text-3xl font-extrabold leading-tight">Help your city see the issues that matter.</h2>
          <p className="mt-3 max-w-md text-base leading-7 text-white/80">Create an account to report local problems and follow their progress with your municipal team.</p>
        </div>
      </aside>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700"><span>{label}</span><div className="relative mt-1.5"><span className="pointer-events-none absolute left-3 top-3 text-slate-400">{icon}</span>{children}</div></label>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}{message.includes("already registered") && <> <Link href="/login" className="font-bold underline">Go to sign in</Link> or use different account details.</>}</span></p>;
}
