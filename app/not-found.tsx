import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
export default function NotFound() { return <main className="grid min-h-screen place-items-center bg-slate-50 p-5 text-center"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">404</p><h1 className="mt-2 text-4xl font-extrabold text-ink">This page isn’t available.</h1><p className="mt-3 text-slate-600">It may have moved, or you may not have permission to view it.</p><Link href="/dashboard" className={buttonClass("primary", "mt-7")}>Go to dashboard</Link></div></main>; }
