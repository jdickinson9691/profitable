import type { PlanetMarketState } from "../data/types/planetMarketState.ts";
import type { TradeDirection } from "../data/types/tradeDirection.ts";
import { clamp } from "../simulation/clamp.ts";
import {
  BASELINE_DRIFT_PERCENT,
  PRICE_FLOOR_PERCENT,
  PRICE_CEILING_PERCENT,
  PRICE_RECOVERY_PERCENT_PER_HOUR,
} from "../data/constants/tradingConfig.ts";

function bounds(basePrice: number): { floor: number; ceiling: number } {
  return { floor: basePrice * PRICE_FLOOR_PERCENT, ceiling: basePrice * PRICE_CEILING_PERCENT };
}

// Phase 3 GDD §2.6. Direction is the trade's direction from the market's
// perspective: 'sell' = a player sold INTO this market (added supply),
// dropping the price; 'buy' = a player bought FROM this market (removed
// supply), raising it. Applied one unit at a time (not as a single
// compounded exponent) so the floor/ceiling clamp holds even transiently
// mid-calculation, per the contract's explicit requirement.
export function applyDrift(
  marketState: PlanetMarketState,
  unitsTraded: number,
  direction: TradeDirection,
): PlanetMarketState {
  const { floor, ceiling } = bounds(marketState.basePrice);
  const sign = direction === "buy" ? 1 : -1;

  let price = marketState.currentPrice;
  for (let i = 0; i < unitsTraded; i++) {
    price = clamp(price * (1 + sign * BASELINE_DRIFT_PERCENT), floor, ceiling);
  }

  return { ...marketState, currentPrice: price };
}

// Phase 3 GDD §2.6 -- drifts currentPrice back toward basePrice over time
// when untraded. Exponential decay of the remaining gap (percentage of the
// gap closed per hour), consistent with the drift formula's own
// percentage-based/naturally-diminishing design rather than a linear walk
// that could overshoot basePrice. elapsedHours may be fractional.
export function applyRecovery(marketState: PlanetMarketState, elapsedHours: number): PlanetMarketState {
  const gap = marketState.basePrice - marketState.currentPrice;
  const remainingGap = gap * (1 - PRICE_RECOVERY_PERCENT_PER_HOUR) ** elapsedHours;
  const price = marketState.basePrice - remainingGap;

  return { ...marketState, currentPrice: price };
}
