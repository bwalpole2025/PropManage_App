// TrueLayer OAuth redirect target (clean production path). The handler is shared
// with /callback — see lib/banking/truelayer-callback.ts.
export { handleTrueLayerCallback as GET } from "@/lib/banking/truelayer-callback";
