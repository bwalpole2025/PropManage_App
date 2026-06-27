import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { z } from "zod";
import { prisma } from "../db";
import { fullName } from "../format";
import { authConfig } from "./config";
import { isBetaAllowed } from "./beta-allowlist";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // 6-digit TOTP code; only required when the user has 2FA enabled.
  totp: z.string().optional(),
});

// No PrismaAdapter: we use Credentials + JWT sessions, so the adapter's
// AuthAccount/Session tables are not needed (the `authorize` callback does its
// own user lookup). Shares the edge-safe base in ./config; the heavy authorize
// logic (bcrypt, prisma, otplib) lives here so the Edge middleware never imports it.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator code", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, totp } = parsed.data;

        // Closed-beta gate: only allowlisted emails may authenticate, however
        // the credentials arrive (the /beta-access UI or a direct POST). This is
        // the security boundary behind the hidden login.
        if (!isBetaAllowed(email)) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Two-factor enforcement. This is the security boundary: even if the
        // login UI is bypassed and credentials are POSTed directly, no session
        // is issued for a 2FA-enabled user without a valid TOTP code.
        if (user.twoFactorEnabled) {
          const code = (totp ?? "").replace(/\D/g, "");
          if (
            !user.totpSecret ||
            !code ||
            !authenticator.verify({ token: code, secret: user.totpSecret })
          ) {
            return null;
          }
        }

        return {
          id: user.id,
          name: fullName(user),
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
});
