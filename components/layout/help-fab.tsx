import Link from "next/link";
import { LifeBuoy } from "lucide-react";

/** Floating circular help/feedback button, fixed bottom-left → how-to videos. */
export function HelpFab() {
  return (
    <Link
      href="/help"
      aria-label="Help & feedback"
      title="Help & feedback"
      className="fixed bottom-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90"
    >
      <LifeBuoy className="h-6 w-6" />
    </Link>
  );
}
