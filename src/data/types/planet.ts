import type { PlanetType } from "./planetType.ts";
import type { TierColor } from "./tierColor.ts";
import type { QualityRoll } from "./quality.ts";

export interface PlanetPosition {
  x: number;
  y: number;
}

// MVP fields (id, name, producibleResourceIds) stay required and
// unchanged. Phase 2 fields are optional so MVP-era content (e.g. Delta
// Rigelus) still validates without modification -- see
// docs/agents/agent-01-amendment-phase2-schema.md. No modifiers, seasons,
// or market fields yet -- still out of scope.
export interface Planet {
  id: string;
  name: string;
  producibleResourceIds: string[];
  planetType?: PlanetType;
  tier?: TierColor;
  position?: PlanetPosition;
  specialtyResourceId?: string | null;
  discovered?: boolean;
  // Planet Resource Generation amendment: one fixed QualityRoll per
  // producibleResourceIds entry, as of this planet's *current* resource
  // cycle (planetResourceCycle.ts). This is the cycle-0 snapshot only --
  // `getCurrentPlanetResources()` is the live, always-current read; this
  // field on a cached/regenerated Planet object is a fallback only,
  // exactly the same relationship producibleResourceIds/specialtyResourceId
  // already have with the live read (see that function's own comment).
  // Optional so pre-this-amendment content/save data still validates.
  resourceQualities?: Record<string, QualityRoll>;
  // Colonist-Driven Production amendment (planet-ownership.md). NEVER
  // set by generatePlanet() -- lives exclusively in the persisted
  // `planetOwnershipState` side-table (src/presentation/planetOwnershipState.ts)
  // and is merged onto a Planet object at read time, the same "normalize
  // the live-read value, never trust the regenerated object's own field"
  // pattern getDiscoveredPlanets() already established for `discovered`.
  // A raw, freshly-generated Planet (not merged) always has this as
  // `undefined`, which getCurrentPlanetResources() below treats as 0.
  //
  // Retroactive removal (2026-08-04): citadelLevel/ownedByPlayerId
  // removed along with Citadels -- see planet-ownership.md's own
  // retroactive note. colonistCount is unaffected.
  colonistCount?: number;
}
