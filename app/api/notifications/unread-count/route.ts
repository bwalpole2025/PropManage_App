import { NextResponse } from "next/server";
import { getActiveContext } from "@/lib/auth/active-org";
import { unreadCount } from "@/lib/notifications/service";

// Polled by the header bell (~30s). Cheap indexed count; 0 if unauthenticated.
export async function GET() {
  try {
    const { entityId, user } = await getActiveContext();
    const count = await unreadCount(entityId, user.id);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
