import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-civic-600 text-white hover:bg-civic-700 focus-visible:ring-civic-500",
  secondary: "bg-civic-50 text-civic-700 hover:bg-civic-100 focus-visible:ring-civic-500",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-civic-500",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-civic-500",
};

export function buttonClass(variant: keyof typeof variants = "primary", className?: string) {
  return cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", variants[variant], className);
}

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}
