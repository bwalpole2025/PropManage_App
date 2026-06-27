import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/edge";
import { isBetaAllowed } from "@/lib/auth/beta-allowlist";

// Closed-beta gatekeeper.
//
// Public, unauthenticated paths (the Coming-Soon landing, the hidden beta login,
// password-reset/verify/invite flows and legal pages) are always allowed. Every
// other route requires an authenticated session whose email is on the
// BETA_TESTER_EMAILS allowlist:
//   - no session            -> redirect to the hidden /beta-access login
//   - session, not on list  -> hard 403 (e.g. an account removed from the beta)
//
// The login itself is gated independently in lib/auth (authorize) and the login
// action, so a non-allowlisted user can never obtain a session in the first
// place; the 403 here is defence in depth.
const PUBLIC_PREFIXES = [
  "/beta-access",
  "/login", // legacy alias — redirects to /beta-access
  "/register", // renders the "registration closed" notice
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/accept-invite",
  "/cookies",
  "/privacy",
  // Provider-facing endpoints: authenticated by signature/signed-state inside
  // the handler, not by a session. Without this the beta gate would 302-redirect
  // unauthenticated provider POSTs (TrueLayer webhooks/OAuth callback) and drop
  // the event.
  "/api/webhooks",
  "/api/banking/truelayer/webhook",
  "/api/banking/truelayer/callback",
  "/callback",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  // Not signed in -> the hidden beta login.
  if (!req.auth) {
    return NextResponse.redirect(new URL("/beta-access", req.url));
  }

  // Signed in but not on the closed-beta allowlist -> 403.
  if (!isBetaAllowed(req.auth.user?.email)) {
    return new NextResponse(
      "403 Forbidden — this account is not part of the PropManage closed beta.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except the NextAuth API, Next internals and static files
  // (any path containing a dot, e.g. .png/.css/.ico).
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
