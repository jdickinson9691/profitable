import { createSeededRandom } from "../galaxy/seededRandom.ts";
import {
  EMERGENCY_CHECK_INTERVAL_HOURS,
  EMERGENCY_TRIGGER_CHANCE,
  EMERGENCY_DURATION_HOURS,
  EMERGENCY_PRICE_PREMIUM_PERCENT,
} from "../data/constants/tradingConfig.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

export interface ActiveEmergency {
  category: string;
  endsAt: number; // epoch ms
}

// Bug fix (Galactic Map Agent 25/26 verification, profitable-map-gdd.md
// Section 7, item 1): Phase 3 GDD §2.9 names "emergencies" ("rare, sudden
// ... randomly-triggered ... purely random, not caused by simulation/
// economy state") as the third trade-map layer, but it was never actually
// implemented. Pure function of (planetId, now, categories) -- no
// persisted state, same "always live, never stale" reasoning as
// season.ts. Time is divided into EMERGENCY_CHECK_INTERVAL_HOURS-long
// windows per planet; each window independently rolls whether an
// emergency starts at that window's own beginning.
//
// No advance warning (map GDD §2.1): an emergency, when a window's roll
// triggers one, is active from the very first instant of that window --
// there is no separate pre-announcement phase before its effect applies.
// This is a genuine implementation of "no advance warning," not just
// "nothing exists to have a delay in."
export function getActiveEmergency(planetId: string, now: number, categories: string[]): ActiveEmergency | null {
  if (categories.length === 0) return null;

  const windowMs = EMERGENCY_CHECK_INTERVAL_HOURS * MS_PER_HOUR;
  const windowIndex = Math.floor(now / windowMs);
  const windowStart = windowIndex * windowMs;
  const endsAt = windowStart + EMERGENCY_DURATION_HOURS * MS_PER_HOUR;

  if (now >= endsAt) return null; // this window's emergency (if any) has already ended

  const random = createSeededRandom(`${planetId}:emergency-window:${windowIndex}`);
  const triggered = random() < EMERGENCY_TRIGGER_CHANCE;
  if (!triggered) return null;

  const sorted = [...categories].sort();
  const category = sorted[Math.floor(random() * sorted.length)]!;

  return { category, endsAt };
}

export function getEmergencyPriceMultiplier(itemCategory: string, emergency: ActiveEmergency | null): number {
  if (!emergency || itemCategory !== emergency.category) return 1;
  return 1 + EMERGENCY_PRICE_PREMIUM_PERCENT;
}
