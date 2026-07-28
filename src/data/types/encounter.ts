import type { QualityRoll } from "./quality.ts";

// Travel Encounters (Non-Combat) GDD §2/§3. EncounterResult is a
// discriminated union on `type`, same pattern as
// CraftResult/ArrivalResult/PurchaseShipResult, rather than one shape with
// a generic `outcome: unknown` bag -- each type's outcome payload is
// genuinely different (a currency grant vs. a rolled item vs. a pass/fail
// plus cost) and callers should get real type narrowing on `type`, not a
// cast.
export type EncounterType = "tradeOpportunity" | "discovery" | "hazard";

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
