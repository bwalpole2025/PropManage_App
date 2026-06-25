import { PlayCircle, BookOpen, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const VIDEOS = [
  {
    title: "Getting started with PropManage",
    description: "Set up your account, add your first property and invite your accountant.",
    duration: "4 min",
  },
  {
    title: "Reconciling transactions",
    description: "Match bank activity to rent and expenses, and categorise for tax.",
    duration: "6 min",
  },
  {
    title: "Tracking compliance & key dates",
    description: "Certificates, reminders and the 30/14/7/1-day expiry warnings.",
    duration: "5 min",
  },
  {
    title: "Understanding your tax estimate",
    description: "How income, allowable expenses and ownership splits feed your figures.",
    duration: "7 min",
  },
  {
    title: "Making Tax Digital (MTD)",
    description: "What MTD means for landlords and how PropManage prepares your submission.",
    duration: "5 min",
  },
  {
    title: "Reports & exporting",
    description: "Generate portfolio and per-property reports for you and your accountant.",
    duration: "3 min",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help"
        description="How-to videos and guides for getting the most out of PropManage."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEOS.map((v) => (
          <Card key={v.title} className="overflow-hidden">
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
              <PlayCircle className="h-12 w-12 text-primary/70" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2 text-base">
                <span>{v.title}</span>
                <Badge tone="neutral">{v.duration}</Badge>
              </CardTitle>
              <CardDescription>{v.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Help centre</p>
              <p className="text-sm text-muted-foreground">
                Browse step-by-step articles (coming soon).
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Contact support</p>
              <p className="text-sm text-muted-foreground">
                We aim to reply within one working day (coming soon).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
