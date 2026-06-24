// Env-based service factory. UI/data code imports `services` from here and is
// agnostic to whether a real or mock implementation is wired in.
//
//   SERVICE_MODE=mock            -> force all external services to mock
//   BANK_FEED_PROVIDER=mock|...  -> per-service override for the bank feed
//   HMRC_MTD_MODE=mock|hmrc      -> per-service override for HMRC MTD
//
// Outside production we default to mock so screens are fully usable locally.

import { MockBankFeedService } from "./mock/bankFeed";
import { MockHmrcMtdService } from "./mock/hmrcMtd";
import { DefaultTaxEstimationService } from "./taxEstimation";
import type {
  BankFeedService,
  HmrcMtdService,
  TaxEstimationService,
} from "./types";

const forceMocks =
  process.env.SERVICE_MODE === "mock" ||
  process.env.NODE_ENV !== "production";

function makeBankFeed(): BankFeedService {
  const provider = process.env.BANK_FEED_PROVIDER ?? "mock";
  if (forceMocks || provider === "mock") return new MockBankFeedService();
  // Real implementations (e.g. TrueLayer/Plaid) plug in here behind the same
  // interface. Until then, fall back to mock rather than crashing.
  return new MockBankFeedService();
}

function makeHmrc(): HmrcMtdService {
  const mode = process.env.HMRC_MTD_MODE ?? "mock";
  if (forceMocks || mode === "mock") return new MockHmrcMtdService();
  // Real HMRC MTD client plugs in here behind the same interface.
  return new MockHmrcMtdService();
}

export const services: {
  bankFeed: BankFeedService;
  hmrc: HmrcMtdService;
  tax: TaxEstimationService;
} = {
  bankFeed: makeBankFeed(),
  hmrc: makeHmrc(),
  tax: new DefaultTaxEstimationService(),
};

export type { BankFeedService, HmrcMtdService, TaxEstimationService } from "./types";
