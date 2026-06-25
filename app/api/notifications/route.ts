import { NextResponse } from "next/server";
import { getActiveContext } from "@/lib/auth/active-org";
import { listForUser, unreadCount } from "@/lib/notifications/service";

// Recent notifications + unread count, fetched by the header bell when opened.
export async function GET() {
  try {
    const { entityId, user } = await getActiveContext();
    const [items, count] = await Promise.all([
      listForUser(entityId, user.id, { limit: 15 }),
      unreadCount(entityId, user.id),
    ]);
    return NextResponse.json({ count, items });
  } catch {
    return NextResponse.json({ count: 0, items: [] });
  }
}
