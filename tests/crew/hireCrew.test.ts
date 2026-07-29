import { test } from "node:test";
import assert from "node:assert/strict";
import { hireCrew } from "../../src/crew/hireCrew.ts";
import type { CrewCandidate } from "../../src/data/types/crewCandidate.ts";
import type { PlanetCrewPool } from "../../src/data/types/planetCrewPool.ts";
import type { CrewCapacity } from "../../src/data/types/crewCapacity.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { HireSucceeded } from "../../src/data/types/hireResult.ts";

const candidate: CrewCandidate = { id: "candidate-1", tier: "Blue", profession: null };

function basePool(overrides: Partial<PlanetCrewPool> = {}): PlanetCrewPool {
  return { planetId: "delta-rigelus", availableHires: [candidate], lastRefreshedAt: 0, ...overrides };
}

function baseCapacity(overrides: Partial<CrewCapacity> = {}): CrewCapacity {
  return { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0, ...overrides };
}

function baseWallet(overrides: Partial<Wallet> = {}): Wallet {
  return { playerId: "player-1", credits: 1000, ...overrides };
}

test("hireCrew() succeeds: deducts the exact tier-scaled cost, removes the candidate from the pool", () => {
  const result = hireCrew(candidate, basePool(), baseCapacity(), [], baseWallet(), "player-1", 100) as HireSucceeded;

  assert.equal(result.hired, true);
  assert.equal(result.updatedWallet.credits, 1000 - 350); // Blue tier hire cost
  assert.equal(result.updatedPool.availableHires.length, 0);
});

test("hireCrew() creates an idle crew member with the candidate's tier/profession and the tier-scaled wage", () => {
  const result = hireCrew(candidate, basePool(), baseCapacity(), [], baseWallet(), "player-1", 100) as HireSucceeded;

  assert.deepEqual(result.crewMember, {
    id: "candidate-1",
    hiredByPlayerId: "player-1",
    tier: "Blue",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 100,
    lastCheckedAt: 100,
    wageAmount: 40, // Blue tier wage
    lastPaidAt: 100,
  });
});

test("hireCrew() rejects a candidate not present in the pool", () => {
  const stranger: CrewCandidate = { id: "not-in-pool", tier: "Blue", profession: null };
  const result = hireCrew(stranger, basePool(), baseCapacity(), [], baseWallet(), "player-1");
  assert.equal(result.hired, false);
});

test("hireCrew() rejects when the player is at crew capacity", () => {
  const fullCrew: CrewMember[] = [
    { id: "c1", hiredByPlayerId: "player-1", tier: "Grey", profession: null, status: "idle", assignedCraftId: null, hiredAt: 0, lastCheckedAt: 0, wageAmount: 5, lastPaidAt: 0 },
    { id: "c2", hiredByPlayerId: "player-1", tier: "Grey", profession: null, status: "idle", assignedCraftId: null, hiredAt: 0, lastCheckedAt: 0, wageAmount: 5, lastPaidAt: 0 },
  ];
  const result = hireCrew(candidate, basePool(), baseCapacity(), fullCrew, baseWallet(), "player-1");
  assert.equal(result.hired, false);
});

test("hireCrew() rejects when the wallet can't cover the hire cost", () => {
  const result = hireCrew(candidate, basePool(), baseCapacity(), [], baseWallet({ credits: 100 }), "player-1");
  assert.equal(result.hired, false);
});
