// The unit boundary between our internal integer PENCE and HMRC's decimal
// POUNDS. A leak here 100x's every figure on a tax return, so it is confined to
// one tiny, unit-tested module used only by the real adapter.

/** Internal pence -> HMRC decimal pounds (2dp). 125000 -> 1250.00 */
export function toHmrcMoney(pence: number): number {
  return Number((pence / 100).toFixed(2));
}

/** HMRC decimal pounds -> internal pence. 1250.00 -> 125000; undefined passes through. */
export function fromHmrcMoney(pounds: number | null | undefined): number | undefined {
  return pounds == null ? undefined : Math.round(pounds * 100);
}
