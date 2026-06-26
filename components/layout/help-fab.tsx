"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LifeBuoy,
  BookOpen,
  CalendarClock,
  MessageSquarePlus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { TUTORIAL_BOOKING_URL } from "@/lib/help";
import { sendFeedbackAction, type FeedbackState } from "@/actions/feedback";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

/**
 * Floating help/feedback button shown on every app screen. Opens a small menu:
 * how-to guides, book a live tutorial, or send feedback (a dialog that posts to
 * the support inbox). Keyboard accessible: the trigger toggles the menu, Escape
 * and outside-click close it, and the dialog traps focus + closes on Escape.
 */
export function HelpFab() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div ref={wrapRef} className="fixed bottom-6 left-6 z-40">
      {menuOpen ? (
        <div
          role="menu"
          aria-label="Help and feedback"
          className="absolute bottom-14 left-0 w-60 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <Link
            href="/help"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            How-to guides
          </Link>
          <a
            href={TUTORIAL_BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
            Book a live tutorial
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setFeedbackOpen(true);
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <MessageSquarePlus className="h-4 w-4 text-primary" aria-hidden="true" />
            Send feedback
          </button>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Help & feedback"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <LifeBuoy className="h-6 w-6" aria-hidden="true" />
      </button>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}

function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    sendFeedbackAction,
    {},
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClose={() => onOpenChange(false)} />
        {state.ok ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
            <DialogTitle>Thanks for the feedback</DialogTitle>
            <DialogDescription>
              We read every message and use it to improve PropManage.
            </DialogDescription>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form action={action}>
            <DialogHeader>
              <DialogTitle>Send feedback</DialogTitle>
              <DialogDescription>
                Found a bug or have an idea? Tell us — it goes straight to the
                team.
              </DialogDescription>
            </DialogHeader>

            <input type="hidden" name="page" value={pathname} />

            <div className="space-y-3">
              <div>
                <Label htmlFor="feedback-kind">Type</Label>
                <Select id="feedback-kind" name="kind" defaultValue="idea">
                  <option value="idea">Idea / suggestion</option>
                  <option value="bug">Bug / something broke</option>
                  <option value="question">Question</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="feedback-message">Your message</Label>
                <Textarea
                  id="feedback-message"
                  name="message"
                  required
                  minLength={3}
                  rows={4}
                  placeholder="What's on your mind?"
                />
              </div>
              {state.error ? (
                <p className="text-sm text-danger" role="alert">
                  {state.error}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
                    Sending…
                  </>
                ) : (
                  "Send feedback"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
