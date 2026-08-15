import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-600 text-white"><Building2 size={21} /></span>
          <span className="max-w-48 text-sm font-extrabold leading-tight tracking-tight sm:max-w-none sm:text-lg">AI-based Municipal Grievance Portal</span>
        </div>
        <Link href="/login" className={buttonClass("outline")}>Sign in</Link>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-10">
        <div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl">Report an issue.<br /><span className="text-civic-600">Track its resolution.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Submit municipal complaints and stay informed as the responsible team takes action.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={buttonClass("primary", "px-5")}>Report an issue <ArrowRight size={17} /></Link>
            <Link href="/login" className={buttonClass("outline", "px-5")}>Track my complaint</Link>
          </div>
        </div>
        <div className="flex min-h-72 items-center justify-center lg:h-[calc(100vh-7rem)] lg:min-h-[32rem] lg:justify-end">
          <img src="https://www.image2url.com/r2/default/images/1786780644778-4cabbe7f-395f-4530-b084-c79a9ad70636.png" alt="image" className="h-auto max-h-full max-w-full w-auto object-contain" />
        </div>
      </section>
    </main>
  );
}
