import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

function validDate(value: unknown) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: unknown) {
  const date = validDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatRelativeDate(value: unknown) {
  const date = validDate(value);
  if (!date) return "Date unavailable";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

export const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const statuses = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED", "REJECTED", "DUPLICATE", "ESCALATED"] as const;
export const categories = ["Road Damage", "Garbage", "Drainage", "Sewage", "Streetlight", "Water Supply", "Sanitation", "Flooding", "Infrastructure", "Public Safety", "Other"] as const;

export type Priority = (typeof priorities)[number];
export type ComplaintStatus = (typeof statuses)[number];
export type Category = (typeof categories)[number];
