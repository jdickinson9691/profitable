import type { CrewCandidate } from "../data/types/crewCandidate.ts";
import type { CrewMember } from "../data/types/crewMember.ts";
import type { PlanetCrewPool } from "../data/types/planetCrewPool.ts";
import type { CrewCapacity } from "../data/types/crewCapacity.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { HireResult } from "../data/types/hireResult.ts";
import { CREW_HIRE_COST_BY_TIER, CREW_WAGE_BY_TIER } from "../data/constants/crewConfig.ts";

// Phase 4 GDD §2.3/§2.4. Necessary completion: takes the actual pool/
// capacity/wallet/existing-crew data directly rather than IDs into an
// implicit store -- same pure-function reasoning already applied to
// Agent 11's purchaseListing()/getGlobalPrice(). Also checks wallet
// sufficiency before deducting, which Agent 11's purchaseListing() never
// did (a known, separately-documented gap there) -- "deducts the cost"
// only makes sense here if there's something to deduct from.
export function hireCrew(
  candidate: CrewCandidate,
  pool: PlanetCrewPool,
  capacity: CrewCapacity,
  existingCrew: CrewMember[],
  wallet: Wallet,
  playerId: string,
  now: number = Date.now(),
): HireResult {
  if (!pool.availableHires.some((entry) => entry.id === candidate.id)) {
    return { hired: false, reason: "candidate is not in this planet's crew pool" };
  }

  const maxCrew = capacity.baseCapacity + capacity.purchasedSlots;
  if (existingCrew.length >= maxCrew) {
    return { hired: false, reason: `at crew capacity (${existingCrew.length}/${maxCrew})` };
  }

  const cost = CREW_HIRE_COST_BY_TIER.find((entry) => entry.tier === candidate.tier)?.cost;
  if (cost === undefined) {
    throw new RangeError(`no hire cost defined for tier ${candidate.tier}`);
  }
  if (wallet.credits < cost) {
    return { hired: false, reason: `insufficient funds: need ${cost}, have ${wallet.credits}` };
  }

  const wageAmount = CREW_WAGE_BY_TIER.find((entry) => entry.tier === candidate.tier)?.wage;
  if (wageAmount === undefined) {
    throw new RangeError(`no wage defined for tier ${candidate.tier}`);
  }

  const crewMember: CrewMember = {
    id: candidate.id,
    hiredByPlayerId: playerId,
    tier: candidate.tier,
    profession: candidate.profession,
    status: "idle",
    assignedCraftId: null,
    hiredAt: now,
    lastCheckedAt: now,
    wageAmount,
    lastPaidAt: now,
  };

  return {
    hired: true,
    crewMember,
    updatedPool: {
      ...pool,
      availableHires: pool.availableHires.filter((entry) => entry.id !== candidate.id),
    },
    updatedWallet: { ...wallet, credits: wallet.credits - cost },
  };
}
