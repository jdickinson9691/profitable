import type { PlanetType } from "./planetType.ts";
import type { TierColor } from "./tierColor.ts";

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
}
