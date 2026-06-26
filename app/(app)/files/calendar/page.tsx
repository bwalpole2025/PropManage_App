import { getActiveContext } from "@/lib/auth/active-org";
import { getCalendarData } from "@/services/calendar";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import {
  CALENDAR_TYPES,
  todayKeyInTz,
  type CalendarEventType,
} from "@/lib/calendar";

type View = "month" | "week" | "day";

function parseTypes(raw?: string): CalendarEventType[] {
  if (!raw) return [...CALENDAR_TYPES];
  const set = new Set(raw.split(",").map((s) => s.trim()));
  const out = CALENDAR_TYPES.filter((t) => set.has(t));
  return out.length ? out : [...CALENDAR_TYPES];
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const { events, timeZone, focusedKey } = await getCalendarData(
    ctx.entityId,
    sp.date,
  );
  const view: View =
    sp.view === "week" ? "week" : sp.view === "day" ? "day" : "month";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Rent due, document expiries, reminders and account events across your portfolio."
      />
      <CalendarView
        events={events}
        timeZone={timeZone}
        view={view}
        focusedKey={focusedKey}
        todayKey={todayKeyInTz(timeZone)}
        enabledTypes={parseTypes(sp.types)}
      />
    </div>
  );
}
