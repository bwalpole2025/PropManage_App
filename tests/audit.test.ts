import { describe, it, expect, vi, beforeEach } from "vitest";

// Keep the unit test DB-free: stub the prisma client module so importing the
// audit helper never constructs a real PrismaClient.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { auditLog: { create: vi.fn() } } }));

import {
  recordAudit,
  AuditAction,
  AuditActionLabel,
  EXTERNAL_SUBMISSION_ACTIONS,
} from "@/lib/audit";

type Client = Parameters<typeof recordAudit>[1];

function fakeClient(create: ReturnType<typeof vi.fn>): Client {
  return { auditLog: { create } } as unknown as Client;
}

describe("audit action vocabulary", () => {
  it("has a human-readable label for every action", () => {
    for (const action of Object.values(AuditAction)) {
      expect(AuditActionLabel[action], action).toBeTruthy();
    }
  });

  it("classifies external (HMRC/open-banking) submissions, not internal edits", () => {
    expect(EXTERNAL_SUBMISSION_ACTIONS.has(AuditAction.MTD_SUBMIT_QUARTERLY)).toBe(true);
    expect(EXTERNAL_SUBMISSION_ACTIONS.has(AuditAction.MTD_SUBMIT_FINAL)).toBe(true);
    expect(EXTERNAL_SUBMISSION_ACTIONS.has(AuditAction.BANK_CONNECT)).toBe(true);
    expect(EXTERNAL_SUBMISSION_ACTIONS.has(AuditAction.TRANSACTION_CREATE)).toBe(false);
    expect(EXTERNAL_SUBMISSION_ACTIONS.has(AuditAction.DATA_EXPORT)).toBe(false);
  });
});

describe("recordAudit", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("writes one row with the normalised payload", async () => {
    const create = vi.fn().mockResolvedValue({ id: "a1" });
    await recordAudit(
      {
        accountId: "acc-1",
        actorUserId: "user-1",
        action: AuditAction.TRANSACTION_CREATE,
        targetType: "Transaction",
        targetId: "txn-1",
        metadata: { amountPence: 12_500 },
      },
      fakeClient(create),
    );
    expect(create).toHaveBeenCalledTimes(1);
    const { data } = create.mock.calls[0][0];
    expect(data.accountId).toBe("acc-1");
    expect(data.actorUserId).toBe("user-1");
    expect(data.action).toBe(AuditAction.TRANSACTION_CREATE);
    expect(data.targetId).toBe("txn-1");
    expect(data.metadata).toEqual({ amountPence: 12_500 });
  });

  it("defaults optional fields to null", async () => {
    const create = vi.fn().mockResolvedValue({});
    await recordAudit(
      { accountId: "acc-1", action: AuditAction.DATA_EXPORT },
      fakeClient(create),
    );
    const { data } = create.mock.calls[0][0];
    expect(data.actorUserId).toBeNull();
    expect(data.targetType).toBeNull();
    expect(data.targetId).toBeNull();
  });

  it("is best-effort: a write failure is swallowed (never throws)", async () => {
    const create = vi.fn().mockRejectedValue(new Error("db unavailable"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      recordAudit(
        { accountId: "acc-1", action: AuditAction.MTD_SUBMIT_FINAL },
        fakeClient(create),
      ),
    ).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
  });
});
