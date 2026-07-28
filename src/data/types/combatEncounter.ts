import type { TierColor } from "./tierColor.ts";

// Combat GDD §1/§2.2/§2.3/§3. Deliberately NOT a variant of
// EncounterResult (encounter.ts) -- see that file's own note on why.
// CombatEncounter instead carries its own pending -> resolved lifecycle:
// opponentThreatTier is rolled once, immediately, at detection time (the
// only randomness that happens then, per §2.4's determinism requirement);
// status/outcome only change later, via an explicit resolveCombatChoice()
// call (Agent 20's amendment) -- never automatically.
export interface CombatEncounter {
  id: string;
  voyageId: string;
  triggerContext: "travel" | "arrival";
  opponentThreatTier: TierColor;
  status: "pending" | "resolved";
  // null while pending -- only ever set by resolveCombatChoice().
  outcome: "win" | "lose" | "flee" | null;
  // null for an arrival-triggered encounter -- there is no travel window
  // to index into (§3's own note: "null for arrival-triggered").
  windowIndex: number | null;
}
