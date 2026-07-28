import { createSeededRandom } from "../galaxy/seededRandom.ts";
import { SEASON_CYCLE_HOURS, SEASON_PRICE_SWING_PERCENT } from "../data/constants/tradingConfig.ts";

export type Season = "Spring" | "Summer" | "Autumn" | "Winter";
export const SEASONS: readonly Season[] = ["Spring", "Summer", "Autumn", "Winter"];

const MS_PER_HOUR = 60 * 60 * 1000;

export interface SeasonalEffect {
  season: Season;
  cheapCategory: string;
  premiumCategory: string;
}

// Bug fix (Galactic Map Agent 25/26 verification, profitable-map-gdd.md
// Section 7, item 1): Phase 3 GDD §2.9 names "seasons" as one of the trade
// map's three data layers, but it was never actually implemented -- only
// baseline drift existed. Pure function of (planetId, now) -- no persisted
// state, so this can never go stale (the map GDD's own §2.2 "always live"
// property holds trivially: there is nothing stored to go stale). A
// planet's own seed-derived phase offset keeps its cycle out of sync with
// every other planet, rather than the whole galaxy entering the same
// season simultaneously.
function planetPhaseOffsetHours(planetId: string): number {
  const random = createSeededRandom(`${planetId}:season-phase`);
  return Math.floor(random() * SEASONS.length) * SEASON_CYCLE_HOURS;
}

export function getCurrentSeason(planetId: string, now: number): Season {
  const offsetMs = planetPhaseOffsetHours(planetId) * MS_PER_HOUR;
  const cycleMs = SEASON_CYCLE_HOURS * MS_PER_HOUR;
  const index = Math.floor((now + offsetMs) / cycleMs) % SEASONS.length;
  return SEASONS[index]!;
}

// Which category this planet's current season favors (sells cheap) and
// which it disfavors (buys at a premium) -- "swings its buy/sell lists"
// realized concretely. Deterministic per (planetId, season), drawn only
// from categories the caller says are actually live-traded on this planet,
// so this never names a category with no real market data behind it.
export function getSeasonalEffect(planetId: string, now: number, categories: string[]): SeasonalEffect | null {
  if (categories.length === 0) return null;

  const season = getCurrentSeason(planetId, now);
  const random = createSeededRandom(`${planetId}:${season}:season-effect`);
  const sorted = [...categories].sort(); // stable regardless of caller's input order

  const cheapCategory = sorted[Math.floor(random() * sorted.length)]!;
  const remaining = sorted.filter((category) => category !== cheapCategory);
  const premiumCategory = remaining.length > 0 ? remaining[Math.floor(random() * remaining.length)]! : cheapCategory;

  return { season, cheapCategory, premiumCategory };
}

export function getSeasonalPriceMultiplier(itemCategory: string, effect: SeasonalEffect | null): number {
  if (!effect) return 1;
  if (itemCategory === effect.cheapCategory) return 1 - SEASON_PRICE_SWING_PERCENT;
  if (itemCategory === effect.premiumCategory) return 1 + SEASON_PRICE_SWING_PERCENT;
  return 1;
}
