import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: { default: "AI-based Municipal Grievance Portal", template: "%s | AI-based Municipal Grievance Portal" },
  description: "AI-powered municipal grievance reporting and resolution platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
