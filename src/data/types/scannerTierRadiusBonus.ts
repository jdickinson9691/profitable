import type { TierColor } from "./tierColor.ts";

// Scanner/Probe GDD §2.4 -- "range scales with the scanner item's own
// tier... additive bonus on a base radius, reusing the shape of the
// schematic-tier contribution table (Grey +0 up to Gold's top value)."
// A flat additive bonus on top of SCANNER_BASE_SCAN_RADIUS, same
// "Grey is the floor, not a penalty" convention as HazardTierModifier/
// ShipTierSpeedModifier -- a scanner's tier is a skill/equipment
// investment axis, not a "how good is this place" axis like planet tier.
export interface ScannerTierRadiusBonus {
  tier: TierColor;
  radiusBonus: number;
}
