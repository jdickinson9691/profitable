import type { ShipCandidate } from "../data/types/shipCandidate.ts";
import type { ShipyardPool } from "../data/types/shipyardPool.ts";
import type { Ship } from "../data/types/ship.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { PurchaseShipResult } from "../data/types/purchaseShipResult.ts";
import { SHIP_PURCHASE_COST_BY_TIER } from "../data/constants/shipsAndTravelConfig.ts";
import { deriveFuelCapacity } from "./deriveFuelCapacity.ts";

// Phase 5 GDD §2.2. Necessary completion: takes the actual candidate/
// pool/wallet data directly rather than IDs into an implicit store --
// same pure-function reasoning already applied to Agent 11's
// purchaseListing() and Agent 16's hireCrew(). Also checks wallet
// sufficiency before deducting (a check Agent 11's purchaseListing()
// never added -- a known, separately-documented gap there); "deducts the
// appropriate cost" only makes sense if there's something to deduct from.
//
// No capacity check exists here, unlike hireCrew() -- the design doc
// never decided a ship-ownership limit analogous to CrewCapacity, so
// none is enforced.
export function purchaseShip(
  candidate: ShipCandidate,
  pool: ShipyardPool,
  wallet: Wallet,
  playerId: string,
): PurchaseShipResult {
  if (!pool.availableShips.some((entry) => entry.id === candidate.id)) {
    return { purchased: false, reason: "candidate is not in this planet's shipyard pool" };
  }

  const cost = SHIP_PURCHASE_COST_BY_TIER.find((entry) => entry.tier === candidate.tier)?.cost;
  if (cost === undefined) {
    throw new RangeError(`no purchase cost defined for tier ${candidate.tier}`);
  }
  if (wallet.credits < cost) {
    return { purchased: false, reason: `insufficient funds: need ${cost}, have ${wallet.credits}` };
  }

  // Ship Fuel amendment: a freshly-purchased ship starts with a full tank
  // at its own tier's capacity -- never STARTING_SHIP_FUEL_CAPACITY, which
  // is exclusively the very first, pre-assigned starting ship's bootstrap
  // value, not a general "new ship" rule.
  const fuelCapacity = deriveFuelCapacity(candidate.tier);

  const ship: Ship = {
    id: candidate.id,
    name: candidate.name,
    ownerId: playerId,
    tier: candidate.tier,
    currentPlanetId: pool.planetId,
    fuelCapacity,
    currentFuel: fuelCapacity,
    components: candidate.components,
  };

  return {
    purchased: true,
    ship,
    updatedPool: {
      ...pool,
      availableShips: pool.availableShips.filter((entry) => entry.id !== candidate.id),
    },
    updatedWallet: { ...wallet, credits: wallet.credits - cost },
  };
}
