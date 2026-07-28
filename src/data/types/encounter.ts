import type { QualityRoll } from "./quality.ts";

// Travel Encounters (Non-Combat) GDD §2/§3. EncounterResult is a
// discriminated union on `type`, same pattern as
// CraftResult/ArrivalResult/PurchaseShipResult, rather than one shape with
// a generic `outcome: unknown` bag -- each type's outcome payload is
// genuinely different (a currency grant vs. a rolled item vs. a pass/fail
// plus cost) and callers should get real type narrowing on `type`, not a
// cast.
//
// Combat GDD §3: "extends the existing enum" -- EncounterType now also
// covers `combat`, since it's still one of the four possible outcomes of
// the shared weighted type-split roll. Deliberately NOT matched by a
// fourth EncounterResult variant, though: every variant below represents a
// fully resolved, synchronous outcome (this file's own doc above), a shape
// combat structurally cannot fit -- it is detected (and reported pending)
// but not resolved until an explicit, separate player choice. See
// combatEncounter.ts's own CombatEncounter for that lifecycle instead.
export type EncounterType = "tradeOpportunity" | "discovery" | "hazard" | "combat";

export interface TradeOpportunityEncounterResult {
  type: "tradeOpportunity";
  windowIndex: number;
  outcome: { creditsGranted: number };
}

// Necessary completion: the GDD's own outcome description says "the rolled
// Resource + QualityRoll," but storing a full Resource object inline would
// duplicate content data inside Voyage, which persists through SaveSystem
// indefinitely. Every other reference to a resource elsewhere in this
// codebase (Listing.itemId, VoyageCargoItem.itemId) is an id string into
// content, not an embedded object -- resourceId here follows that same
// convention rather than inventing a new one.
export interface DiscoveryEncounterResult {
  type: "discovery";
  windowIndex: number;
  outcome: { resourceId: string; qualities: QualityRoll };
}

export interface HazardEncounterResult {
  type: "hazard";
  windowIndex: number;
  // creditsLost is always present (0 when passed), not optional -- same
  // "always-present, meaningfully zero" convention as RefineResult.refundUnits,
  // rather than an optional field that only exists on failure.
  outcome: { passed: boolean; creditsLost: number };
}

export type EncounterResult =
  | TradeOpportunityEncounterResult
  | DiscoveryEncounterResult
  | HazardEncounterResult;
