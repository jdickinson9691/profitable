import { test } from "node:test";
import assert from "node:assert/strict";
import { payUpkeep } from "../../src/crew/payUpkeep.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { PaymentPaid } from "../../src/data/types/paymentResult.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

function crewMember(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id: "crew-1",
    hiredByPlayerId: "player-1",
    tier: "Blue",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 35,
    lastPaidAt: 0,
    ...overrides,
  };
}

test("payUpkeep() reports not-due before a full payment interval has elapsed", () => {
  const result = payUpkeep(crewMember({ lastPaidAt: 0 }), { playerId: "player-1", credits: 1000 }, 10 * MS_PER_HOUR);
  assert.equal(result.status, "not-due");
});

test("payUpkeep() deducts the exact wage and updates lastPaidAt once an interval has elapsed", () => {
  const result = payUpkeep(
    crewMember({ lastPaidAt: 0, wageAmount: 35 }),
    { playerId: "player-1", credits: 1000 },
    24 * MS_PER_HOUR,
  ) as PaymentPaid;

  assert.equal(result.status, "paid");
  assert.equal(result.updatedWallet.credits, 1000 - 35);
  assert.equal(result.updatedCrewMember.lastPaidAt, 24 * MS_PER_HOUR);
});

test("payUpkeep() reports insufficient-funds without mutating anything when the wallet can't cover the wage", () => {
  const result = payUpkeep(
    crewMember({ lastPaidAt: 0, wageAmount: 35 }),
    { playerId: "player-1", credits: 10 },
    24 * MS_PER_HOUR,
  );
  assert.equal(result.status, "insufficient-funds");
});

test("payUpkeep() does not mutate the input crew member or wallet", () => {
  const member = crewMember({ lastPaidAt: 0 });
  const wallet: Wallet = { playerId: "player-1", credits: 1000 };
  const memberSnapshot = { ...member };
  const walletSnapshot = { ...wallet };
  payUpkeep(member, wallet, 24 * MS_PER_HOUR);
  assert.deepEqual(member, memberSnapshot);
  assert.deepEqual(wallet, walletSnapshot);
});
