import { PlayCircle, BookOpen, MessageCircle, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HELP_VIDEOS,
  helpVideoUrl,
  TUTORIAL_BOOKING_URL,
  HELP_CENTER_URL,
} from "@/lib/help";

export const metadata = { title: "Help — PropManage" };

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help"
        description="How-to videos, guides and a live tutorial to get the most out of PropManage."
      />

      {/* Live tutorial booking CTA */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CalendarClock className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">Book a live tutorial</p>
              <p className="text-sm text-muted-foreground">
                A free 1:1 walkthrough with our team — bring your portfolio and
                your questions.
              </p>
            </div>
          </div>
          <a href={TUTORIAL_BOOKING_URL} target="_blank" rel="noreferrer">
            <Button>Choose a time</Button>
          </a>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_VIDEOS.map((v) => (
          <a
            key={v.slug}
            href={helpVideoUrl(v.slug)}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
                <PlayCircle className="h-12 w-12 text-primary/70 transition-transform group-hover:scale-110" aria-hidden="true" />
              </div>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span>{v.title}</span>
                  <Badge tone="neutral">{v.duration}</Badge>
                </CardTitle>
                <CardDescription>{v.description}</CardDescription>
              </CardHeader>
            </Card>
          </a>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href={HELP_CENTER_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 pt-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">Help centre</p>
                <p className="text-sm text-muted-foreground">
                  Browse step-by-step articles and FAQs.
                </p>
              </div>
            </CardContent>
          </Card>
        </a>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">Contact support</p>
              <p className="text-sm text-muted-foreground">
                Use the help button (bottom-left) to send feedback — we reply
                within one working day.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
