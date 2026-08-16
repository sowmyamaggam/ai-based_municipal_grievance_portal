"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { AlertCircle, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emptyForm = { name: "", email: "", phone: "", password: "" };

export default function RegisterPage() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionError, setSessionError] = useState("");

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create your account");

      setSuccess(true);

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (!result?.error) {
        window.location.assign("/dashboard");
        return;
      }

      setSessionError("Your account is ready, but automatic sign-in was unavailable. Please sign in below.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
        <Link href="/" className="flex items-center gap-3 font-extrabold tracking-tight">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-600 text-white">
            <Building2 size={21} />
          </span>
          <span className="text-sm leading-tight sm:text-lg">AI-based Municipal Grievance Portal</span>
        </Link>

        {success ? (
          <div className="py-14 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-civic-600" />
            <h1 className="mt-5 text-2xl font-extrabold">Your account is ready</h1>
            <p className="mt-2 text-slate-600">Your account has been created. Sign in to submit and track municipal reports.</p>
            {sessionError && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{sessionError}</p>}
            <Link href="/login" className="mt-7 inline-flex rounded-xl bg-civic-600 px-5 py-3 font-semibold text-white hover:bg-civic-700">Continue to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="mt-9 text-3xl font-extrabold tracking-tight text-ink">Create your citizen account</h1>
            <p className="mt-2 text-slate-600">Enter your details to register.</p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <Field label="Full name"><Input value={form.name} onChange={update("name")} required autoComplete="name" /></Field>
              <Field label="Email address"><Input type="email" value={form.email} onChange={update("email")} required autoComplete="email" /></Field>
              <Field label="Mobile number"><Input type="tel" value={form.phone} onChange={update("phone")} required autoComplete="tel" placeholder="+91 98765 43210" /></Field>
              <Field label="Password"><Input type="password" value={form.password} onChange={update("password")} required minLength={8} autoComplete="new-password" /></Field>

              {error && <ErrorMessage message={error} />}

              <Button className="mt-2 w-full" type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : "Create account"}
              </Button>
            </form>
          </>
        )}

        {!success && (
          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered? <Link href="/login" className="font-bold text-civic-700 hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700"><span>{label}</span><div className="mt-1.5">{children}</div></label>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>;
}