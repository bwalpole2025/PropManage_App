import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/active-org";
import { ComingSoon } from "@/components/landing/coming-soon";

// During the closed beta the public landing page is a "coming soon" banner with
// no public sign-up or login. Beta testers reach the app through the hidden
// /beta-access route; access is gated by the BETA_TESTER_EMAILS allowlist.
export default async function HomePage() {
  // An already-signed-in beta tester goes straight to their dashboard.
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return <ComingSoon />;
}
