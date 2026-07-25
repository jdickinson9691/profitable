export type Quality = "purity" | "density" | "potency" | "durability" | "rarity";

export const QUALITIES: readonly Quality[] = [
  "purity",
  "density",
  "potency",
  "durability",
  "rarity",
];

// A single quality's value: 1-100, or null when not applicable to the
// resource (never 0 -- GDD SS3.1).
export type QualityValue = number | null;

export type QualityMap = Record<Quality, QualityValue>;

// The output of rollQuality(): one rolled value (or null) per quality.
export type QualityRoll = QualityMap;
