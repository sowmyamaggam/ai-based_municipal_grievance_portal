"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Building2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("We couldn't sign you in. Check your email and password.");
      setLoading(false);
    } else {
      window.location.assign("/dashboard");
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-12 flex items-center gap-3 font-extrabold tracking-tight">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-600 text-white">
              <Building2 size={21} />
            </span>
            <span className="text-sm leading-tight sm:text-lg">AI-based Municipal Grievance Portal</span>
          </Link>

          <div>
            <p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">Welcome back</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">Sign in to your account</h1>
            <p className="mt-3 text-slate-600">Track reports or help your community resolve issues.</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block text-sm font-semibold text-slate-700">
              Email address
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                <Input
                  className="pl-10"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Password
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                <Input
                  className="pl-10"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in securely"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New to the portal?{" "}
            <Link href="/register" className="font-bold text-civic-700 hover:underline">
              Create a citizen account
            </Link>
          </p>
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
          <h2 className="max-w-lg text-3xl font-extrabold leading-tight">A more responsive city starts with every report.</h2>
          <p className="mt-3 max-w-md text-base leading-7 text-white/80">The AI-based Municipal Grievance Portal connects residents and municipal teams through clear, accountable action.</p>
        </div>
      </aside>
    </main>
  );
}
