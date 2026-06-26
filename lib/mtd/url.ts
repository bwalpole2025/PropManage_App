import { MTD_REDIRECT_PATH } from "./constants";

/**
 * The absolute OAuth callback URL, derived from request headers so it is
 * proxy-aware. HMRC requires the redirect_uri sent to /authorize and to /token
 * to be byte-identical, so BOTH the start action and the callback route build it
 * here from the same forwarded-header logic.
 */
export function callbackUrlFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${MTD_REDIRECT_PATH}`;
}
