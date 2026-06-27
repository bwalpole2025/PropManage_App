import NextAuth from "next-auth";
import { authConfig } from "./config";

// A providers-free NextAuth instance for the Edge middleware. It only decodes
// the JWT session cookie (using AUTH_SECRET + the shared callbacks) — no bcrypt,
// prisma or otplib — so it runs on the Edge runtime. The full Node instance with
// the Credentials provider and the closed-beta `authorize` gate lives in ./index.
export const { auth } = NextAuth(authConfig);
