import type { TierColor } from "./tierColor.ts";
import type { Profession } from "./profession.ts";

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
}
