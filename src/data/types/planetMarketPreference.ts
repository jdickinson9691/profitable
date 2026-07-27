import type { PlanetType } from "./planetType.ts";

// Necessary completion: Agent 14's contract asks for a "Planet market
// preference config (JSON)... loosely informed by Planet Type," but no
// shape existed for it. Keyed by PlanetType (4 fixed values) rather than
// by specific generated-planet id -- Phase 2's galaxy is procedurally
// generated per save from a stored seed (src/presentation/galaxyState.ts),
// so no fixed set of "real" planet ids exists for static content to
// reference ahead of time. A specific generated Planet looks up its
// preference entry by its own `planetType` field at seed time (Agent 15's
// job). This is a day-one seed only -- Agent 11's baseline drift moves
// actual prices away from these initial groupings as soon as any trading
// activity occurs; it is not re-read or treated as authoritative after
// that.
export interface PlanetMarketPreference {
  planetType: PlanetType;
  sellsCheap: string[];
  buysAtPremium: string[];
}
