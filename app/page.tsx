import Link from "next/link";
import { ArrowRight, Building2, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-600 text-white"><Building2 size={21} /></span>
          <span className="max-w-48 text-sm font-extrabold leading-tight tracking-tight sm:max-w-none sm:text-lg">AI-based Municipal Grievance Portal</span>
        </div>
        <Link href="/login" className={buttonClass("outline")}>Sign in</Link>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-24">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-civic-50 px-3 py-1.5 text-sm font-semibold text-civic-700"><Sparkles size={16} /> A smarter way to care for your city</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl">See a civic problem.<br /><span className="text-civic-600">Help get it fixed.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Report municipal issues with a description, photos, and location. The AI-based Municipal Grievance Portal helps route and prioritize reports while keeping every citizen&apos;s voice visible.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={buttonClass("primary", "px-5")}>Report an issue <ArrowRight size={17} /></Link>
            <Link href="/login" className={buttonClass("outline", "px-5")}>Track my complaint</Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feature icon={<MapPinned />} title="Location-aware" text="GPS-aware reports help teams find the issue faster." />
          <Feature icon={<Sparkles />} title="AI-assisted" text="Clear summaries, routing, and priority signals for officers." />
          <Feature icon={<ShieldCheck />} title="Private by design" text="Your contact details and exact location stay protected." />
          <Feature icon={<Building2 />} title="One shared picture" text="Related reports are linked—not deleted—so demand is clear." />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><span className="mb-5 grid h-10 w-10 place-items-center rounded-xl bg-civic-50 text-civic-600">{icon}</span><h2 className="font-bold text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>;
}
