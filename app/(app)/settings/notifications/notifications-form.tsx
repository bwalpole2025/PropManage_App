"use client";

import { useState, useTransition } from "react";
import { Megaphone, Bell, Send } from "lucide-react";
import { updateNotificationPrefsAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  NotificationChannelLabel,
  NotificationChannelDescription,
  NotificationCategoryLabel,
  NotificationCategoryDescription,
  type NotificationChannel as Channel,
  type NotificationCategory as Category,
  type NotificationPreferences,
} from "@/lib/notifications";

export function NotificationsForm({
  initialMarketingOptIn,
  initialPrefs,
  canEdit,
}: {
  initialMarketingOptIn: boolean;
  initialPrefs: NotificationPreferences;
  canEdit: boolean;
}) {
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPrefs);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function setChannel(key: Channel, value: boolean) {
    setPrefs((p) => ({ ...p, channels: { ...p.channels, [key]: value } }));
  }
  function setCategory(key: Category, value: boolean) {
    setPrefs((p) => ({ ...p, categories: { ...p.categories, [key]: value } }));
  }

  function save() {
    startTransition(async () => {
      const res = await updateNotificationPrefsAction({ marketingOptIn, prefs });
      setMsg(res.success ?? res.error ?? null);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Delivery channels
          </CardTitle>
          <CardDescription>
            How your operational alerts reach you. Each enabled category is sent
            on every channel switched on here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_CHANNELS.map((key) => (
            <div
              key={key}
              className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {NotificationChannelLabel[key]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {NotificationChannelDescription[key]}
                </p>
              </div>
              <Switch
                checked={prefs.channels[key]}
                onCheckedChange={(v) => setChannel(key, v)}
                disabled={!canEdit}
                aria-label={NotificationChannelLabel[key]}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notification categories
          </CardTitle>
          <CardDescription>
            Choose which operational alerts you receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_CATEGORIES.map((key) => (
            <div
              key={key}
              className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {NotificationCategoryLabel[key]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {NotificationCategoryDescription[key]}
                </p>
              </div>
              <Switch
                checked={prefs.categories[key]}
                onCheckedChange={(v) => setCategory(key, v)}
                disabled={!canEdit}
                aria-label={NotificationCategoryLabel[key]}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-accent" /> Marketing emails
          </CardTitle>
          <CardDescription>
            Tips, offers and product news — a separate opt-in from the alerts
            above. You can opt out any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">Send me marketing emails</span>
            <Switch
              checked={marketingOptIn}
              onCheckedChange={setMarketingOptIn}
              disabled={!canEdit}
              aria-label="Marketing emails"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!canEdit || pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
        {!canEdit ? (
          <p className="text-sm text-muted-foreground">
            Only the account owner can change these.
          </p>
        ) : null}
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </div>
    </div>
  );
}
