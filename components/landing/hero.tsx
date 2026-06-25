import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-screen hero. The background layers a forest-green gradient OVER the
 * Unsplash photo at /public/jin-cl-gJdQ3FV3-Mw-unsplash.jpg; if that file is
 * absent the url() layer fails silently and the gradient remains (graceful
 * fallback — no broken-image, no build error, since this is a CSS background).
 */
export function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section
      className="relative flex min-h-screen flex-col"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, hsl(var(--hero-overlay-from) / 0.85), hsl(var(--hero-overlay-to) / 0.72)), url('/jin-cl-gJdQ3FV3-Mw-unsplash.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 py-5 text-white md:px-10">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-6 w-6" />
          PropManage
        </Link>
        <nav className="flex items-center gap-2">
          {isAuthed ? (
            <Link href="/dashboard">
              <Button variant="secondary">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero copy */}
      <div className="flex flex-1 items-center px-6 md:px-10">
        <div className="max-w-3xl text-white">
          <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide backdrop-blur">
            Compliance · Property management · Tax
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Run your lettings with confidence.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            PropManage brings compliance, day-to-day property management, profit
            tracking and financial analysis together — making Making Tax Digital
            seamless for buy-to-let landlords.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={isAuthed ? "/dashboard" : "/register"}>
              <Button size="lg">
                {isAuthed ? "Open dashboard" : "Start free"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                See pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Seamless fade into the next (light) section. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}
