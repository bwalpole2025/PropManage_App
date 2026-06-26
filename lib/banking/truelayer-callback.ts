// Shared TrueLayer OAuth callback handler. Exposed at two routes so the
// registered redirect URI can be either the clean `/api/banking/truelayer/
// callback` (production) or the short `/callback` (matches the URI already in
// the sandbox console). TrueLayer matches redirect_uri EXACTLY, so the app must
// send a path that's registered — wiring both keeps either choice working.
//
// We verify the signed `state` (CSRF + which entity started the flow), confirm
// the logged-in user may manage that entity's transactions, then run the shared
// link-completion core (exchange code -> persist tokens -> backfill).

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { MembershipStatus } from "@/lib/enums";
import { verifyState } from "@/lib/banking/state";
import { persistBankLink } from "@/lib/banking/link";

function appUrl(path: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

export async function handleTrueLayerCallback(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      appUrl(`/settings/banking?error=${encodeURIComponent(providerError)}`),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(appUrl("/settings/banking?error=missing_code"));
  }

  const decoded = verifyState(state);
  if (!decoded) {
    return NextResponse.redirect(appUrl("/settings/banking?error=bad_state"));
  }

  // The browser carries the user's session; require login and verify this user
  // actually has manage-transactions rights on the entity named in the state.
  const user = await requireUser(); // redirects to /login if not authenticated
  const membership = await prisma.membership.findUnique({
    where: { userId_accountId: { userId: user.id, accountId: decoded.entityId } },
    select: { role: true, status: true },
  });
  if (
    !membership ||
    membership.status !== MembershipStatus.ACTIVE ||
    !can(membership.role, Capability.MANAGE_TRANSACTIONS)
  ) {
    return NextResponse.redirect(appUrl("/settings/banking?error=forbidden"));
  }

  try {
    const { connectionId } = await persistBankLink({
      entityId: decoded.entityId,
      actorUserId: user.id,
      linkSessionId: decoded.linkSessionId,
      code,
    });
    return NextResponse.redirect(
      appUrl(`/settings/banking?connected=${encodeURIComponent(connectionId)}`),
    );
  } catch (e) {
    console.error("[truelayer] callback failed", e);
    return NextResponse.redirect(appUrl("/settings/banking?error=link_failed"));
  }
}
