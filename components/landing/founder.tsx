import { Building2 } from "lucide-react";

/** "About the Founder" — flows seamlessly out of the hero. */
export function Founder() {
  return (
    <section id="founder" className="bg-background px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[280px_1fr]">
        {/* Portrait placeholder */}
        <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-16 w-16" />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            About the founder
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Built by an applied mathematician turned software developer for his
            parents.
          </h2>
          <div className="mt-5 space-y-4 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Benjamin Walpole</span>{" "}
              is a PhD-holding applied mathematician and software engineer who has
              spent years coding solutions to complex mathematical problems.
            </p>
            <p>
              He saw his parents,{" "}
              <span className="font-medium text-foreground">Roger and Ann</span>,
              who are landlords, concerned about compliance with the new
              Renter&apos;s Rights Act and Making Tax Digital.
            </p>
            <p>
              PropManage was developed to solve this exact problem, integrating
              compliance management, day-to-day property management, profit
              tracking, and financial analysis for those on buy-to-let mortgages —
              making compliance with the new Making Tax Digital seamless.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
