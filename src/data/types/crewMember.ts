import type { TierColor } from "./tierColor.ts";
import type { Profession } from "./profession.ts";
import type { ShipCrewRole } from "./shipCrewRole.ts";

// Phase 4 GDD §2/§3. Timestamps are epoch-ms numbers, matching this
// codebase's existing Date.now() convention (same as Phase 3's Listing).
export interface CrewMember {
  id: string;
  hiredByPlayerId: string;
  tier: TierColor;
  // null for tiers 3-5 (general/unspecialized); set and locked at hire
  // time for tiers 6-7 (§2.2) -- never reassigned after hiring.
  profession: Profession | null;
  status: "idle" | "active";
  assignedCraftId: string | null;
  hiredAt: number;
  // For background/idle catch-up resolution (§2.1a) -- elapsed time is
  // always derived as currentTime - lastCheckedAt, never caller-supplied.
  lastCheckedAt: number;
  wageAmount: number;
  // Used to detect unpaid-upkeep attrition (§2.7) -- a grace period is
  // measured from this timestamp, not from hiredAt.
  lastPaidAt: number;
  // Combat GDD §3: necessary correction to the amendment's own literal
  // pseudocode (`unavailableUntil: timestamp | null // new field only`,
  // written without a `?`) -- same backward-compatibility reasoning as
  // Voyage.isRetreat: a CrewMember persisted before this amendment
  // shipped has no such field at all, and this amendment's own testing
  // requirement demands existing prior-phase data still validates without
  // changes. Optional AND nullable: absent (pre-Combat data) and `null`
  // (available, post-Combat) mean the same thing -- "not currently
  // unavailable" -- set to a future epoch-ms timestamp only by a combat
  // loss (§2.5), cleared back to `null` once that time passes.
  unavailableUntil?: number | null;
  // Ship Crew Roles amendment. Optional/nullable, same backward-
  // compatibility shape as unavailableUntil -- a CrewMember persisted
  // before this amendment has neither field at all; missing and `null`
  // both mean "not assigned to any ship role." A ship-role assignment is
  // separate from status/assignedCraftId -- independent axes, per the
  // "must not gate the other 4 roles" decision (ship.md).
  shipRole?: ShipCrewRole | null;
  assignedShipId?: string | null;
}
