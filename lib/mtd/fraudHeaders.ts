// HMRC fraud-prevention headers (Gov-Client-* / Gov-Vendor-*). HMRC validates
// these on every MTD call and rejects submissions with missing/implausible
// values, so they are built CENTRALLY at the request boundary from real
// request-derived values plus client hints — never fabricated.
//
// Connection method WEB_APP_VIA_SERVER: a browser talks to our server, our
// server talks to HMRC. We forward the originating client's IP, user-agent,
// timezone, screen and window size. See HMRC "Fraud Prevention Headers" docs.

import { GOV_VENDOR_PRODUCT_NAME, GOV_VENDOR_VERSION } from "./constants";
import type { AgentContext } from "../services/types";

export interface FraudClientHints {
  /** Originating browser's public IP (from x-forwarded-for at our edge). */
  publicIp?: string;
  publicPort?: string;
  userAgent?: string;
  /** IANA-derived offset, e.g. "UTC+00:00". */
  timezone?: string;
  /** "width=1920&height=1080&scaling-factor=1&colour-depth=24" */
  screens?: string;
  /** "width=1280&height=720" */
  windowSize?: string;
  /** Stable per-connection device id (UUID) we persist on the MtdConnection. */
  deviceId?: string;
  /** Vendor server public IP (our outbound IP); set from env in real deploys. */
  vendorPublicIp?: string;
}

const enc = encodeURIComponent;

/**
 * Build the fraud-prevention header set. The mock ignores them, but the action
 * layer builds + passes them on every path so the contract is always exercised.
 */
export function buildFraudHeaders(
  hints: FraudClientHints,
  agentContext?: AgentContext,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
    "Gov-Vendor-Product-Name": enc(GOV_VENDOR_PRODUCT_NAME),
    "Gov-Vendor-Version": enc(GOV_VENDOR_VERSION),
  };

  if (hints.deviceId) headers["Gov-Client-Device-ID"] = hints.deviceId;
  if (hints.publicIp) headers["Gov-Client-Public-IP"] = hints.publicIp;
  if (hints.publicPort) headers["Gov-Client-Public-Port"] = hints.publicPort;
  if (hints.userAgent) headers["Gov-Client-User-Agent"] = enc(hints.userAgent);
  if (hints.timezone) headers["Gov-Client-Timezone"] = hints.timezone;
  if (hints.screens) headers["Gov-Client-Screens"] = hints.screens;
  if (hints.windowSize) headers["Gov-Client-Window-Size"] = hints.windowSize;
  if (hints.vendorPublicIp) headers["Gov-Vendor-Public-IP"] = hints.vendorPublicIp;

  // For delegated submission by an agent, identify the acting agent. (Full HMRC
  // agent services additionally need an Agent Services Account + ARN-flavoured
  // OAuth; this records what we have.)
  if (agentContext?.onBehalfOf === "agent") {
    headers["Gov-Client-User-IDs"] = `propmanage=${enc(agentContext.submittedByUserId)}`;
    if (agentContext.arn) {
      headers["Gov-Vendor-License-IDs"] = `propmanage-arn=${enc(agentContext.arn)}`;
    }
  }

  return headers;
}
