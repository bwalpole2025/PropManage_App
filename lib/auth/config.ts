import type { NextAuthConfig } from "next-auth";

// Edge-safe base NextAuth config, shared by the full Node config
// (lib/auth/index.ts, which adds the Credentials provider) and the middleware
// instance (lib/auth/edge.ts, which only decodes the session cookie).
//
// IMPORTANT: this file must NOT import bcrypt, prisma, otplib or any other
// Node-only module — middleware runs on the Edge runtime. The heavy `authorize`
// logic lives only in lib/auth/index.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    // The closed-beta login is hidden at /beta-access (no public /login link).
    signIn: "/beta-access",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.uid) session.user.id = token.uid as string;
        if (token.role) session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
