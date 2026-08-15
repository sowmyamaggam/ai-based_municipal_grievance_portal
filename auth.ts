import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(credentials);
        if (!parsed.success) return null;

        await connectToDatabase();
        const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash").lean();
        if (!user?.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "CITIZEN" | "OFFICER" | "ADMIN";
      }
      return session;
    },
  },
});
