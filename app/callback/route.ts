// Short TrueLayer OAuth redirect target — matches the redirect URI registered in
// the sandbox console (http://localhost:3000/callback). Shares the handler with
// /api/banking/truelayer/callback — see lib/banking/truelayer-callback.ts.
export { handleTrueLayerCallback as GET } from "@/lib/banking/truelayer-callback";
