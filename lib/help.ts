// Help-area content + external links. URLs are configurable via NEXT_PUBLIC_*
// env vars so the real booking page / help centre can be wired in without a code
// change (they fall back to sensible placeholders for local dev and demos).

/** Live one-to-one tutorial booking link (Cal.com / Calendly style). */
export const TUTORIAL_BOOKING_URL =
  process.env.NEXT_PUBLIC_TUTORIAL_BOOKING_URL ??
  "https://cal.com/propmanage/live-tutorial";

/** Base URL of the how-to video / help-centre library. */
export const HELP_CENTER_URL =
  process.env.NEXT_PUBLIC_HELP_CENTER_URL ?? "https://help.propmanage.app";

export interface HelpVideo {
  slug: string;
  title: string;
  description: string;
  duration: string;
}

export const HELP_VIDEOS: HelpVideo[] = [
  {
    slug: "getting-started",
    title: "Getting started with PropManage",
    description:
      "Set up your account, add your first property and invite your accountant.",
    duration: "4 min",
  },
  {
    slug: "reconciling-transactions",
    title: "Reconciling transactions",
    description:
      "Match bank activity to rent and expenses, and categorise for tax.",
    duration: "6 min",
  },
  {
    slug: "compliance-key-dates",
    title: "Tracking compliance & key dates",
    description:
      "Certificates, reminders and the 30/14/7/1-day expiry warnings.",
    duration: "5 min",
  },
  {
    slug: "tax-estimate",
    title: "Understanding your tax estimate",
    description:
      "How income, allowable expenses and ownership splits feed your figures.",
    duration: "7 min",
  },
  {
    slug: "making-tax-digital",
    title: "Making Tax Digital (MTD)",
    description:
      "What MTD means for landlords and how PropManage prepares your submission.",
    duration: "5 min",
  },
  {
    slug: "reports-exporting",
    title: "Reports & exporting",
    description:
      "Generate portfolio and per-property reports for you and your accountant.",
    duration: "3 min",
  },
];

/** Resolve the watch URL for a how-to video. */
export function helpVideoUrl(slug: string): string {
  return `${HELP_CENTER_URL.replace(/\/$/, "")}/videos/${slug}`;
}
