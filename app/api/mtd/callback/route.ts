import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { requireEntityAccess } from "@/lib/auth/active-org";
import { Capability } from "@/lib/auth/rbac";
import { MtdStatus } from "@/lib/enums";
import { verifyState } from "@/lib/mtd/state";
import { callbackUrlFromHeaders } from "@/lib/mtd/url";

// HMRC OAuth redirect target. Validates the signed, single-use state, exchanges
// the authorization code for tokens (the provider encrypts + persists them),
// then marks the connection CONNECTED. The user enters their Government Gateway
// credentials on HMRC's site during the redirect — never in PropManage.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const back = (q: string) => NextResponse.redirect(new URL(`/mtd?${q}`, url.origin));

  // HMRC returned an error (e.g. user denied consent).
  const oauthError = sp.get("error");
  if (oauthError) {
    return back(`error=${encodeURIComponent(sp.get("error_description") ?? oauthError)}`);
  }

  const state = sp.get("state");
  if (!state) return back("error=missing_state");

  let claim: { entityId: string; userId: string; nonce: string };
  try {
    claim = verifyState(state);
  } catch {
    return back("error=invalid_state");
  }

  // The session user must match the one who started the flow + still have access.
  let user;
  try {
    ({ user } = await requireEntityAccess(claim.entityId, Capability.SUBMIT_MTD));
  } catch {
    return back("error=forbidden");
  }
  if (user.id !== claim.userId) return back("error=state_user_mismatch");

  // Single-use: atomically clear the nonce only if it still matches. A second
  // (replayed) callback updates 0 rows and is rejected — no check-then-act race.
  const consumed = await prisma.mtdConnection.updateMany({
    where: { accountId: claim.entityId, oauthState: claim.nonce },
    data: { oauthState: null },
  });
  if (consumed.count === 0) return back("error=state_reused");
  const conn = await prisma.mtdConnection.findUnique({
    where: { accountId: claim.entityId },
    select: { id: true },
  });
  if (!conn) return back("error=state_reused");

  // mockAuth=1 (dev) synthesizes the code the real provider receives from HMRC.
  const code = sp.get("mockAuth") === "1" ? "mock-auth-code" : sp.get("code");
  if (!code) return back("error=missing_code");

  // Must byte-match the redirect_uri sent to /authorize (proxy-aware).
  const redirectUri = callbackUrlFromHeaders(req.headers);
  try {
    const result = await services.hmrc.exchangeCode({
      entityId: claim.entityId,
      code,
      redirectUri,
    });
    // Capture the business income source so later calls have a businessId.
    let businessId: string | undefined;
    try {
      const sources = await services.hmrc.listIncomeSources({ entityId: claim.entityId });
      businessId = (sources.find((s) => s.typeOfBusiness === "uk-property") ?? sources[0])?.businessId;
    } catch {
      // Income sources are best-effort at connect time.
    }
    await prisma.mtdConnection.update({
      where: { id: conn.id },
      data: {
        status: MtdStatus.CONNECTED,
        hmrcUserId: result.hmrcUserId ?? undefined,
        expiresAt: new Date(result.expiresAt),
        ...(businessId ? { businessIncomeSourceId: businessId } : {}),
      },
    });
    return back("connected=1");
  } catch (e) {
    await prisma.mtdConnection
      .update({ where: { id: conn.id }, data: { status: MtdStatus.ERROR } })
      .catch(() => {});
    return back(`error=${encodeURIComponent((e as Error).message)}`);
  }
}
