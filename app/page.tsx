import { getSessionUser } from "@/lib/auth/active-org";
import { Hero } from "@/components/landing/hero";
import { Founder } from "@/components/landing/founder";
import { Pricing } from "@/components/landing/pricing";

// Public marketing landing page. Renders for everyone (no redirect); the CTAs
// adapt to whether the visitor is signed in.
export default async function HomePage() {
  const user = await getSessionUser();
  const isAuthed = Boolean(user);

  return (
    <main>
      <Hero isAuthed={isAuthed} />
      <Founder />
      <Pricing isAuthed={isAuthed} />
    </main>
  );
}
