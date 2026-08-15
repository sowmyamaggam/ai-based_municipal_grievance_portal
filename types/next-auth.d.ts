import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User { role?: "CITIZEN" | "OFFICER" | "ADMIN" }
  interface Session {
    user: { id: string; role: "CITIZEN" | "OFFICER" | "ADMIN" } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT { role?: "CITIZEN" | "OFFICER" | "ADMIN" }
}
