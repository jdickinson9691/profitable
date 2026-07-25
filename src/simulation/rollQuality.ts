import type { Resource } from "../data/types/resource.ts";
import type { QualityRoll } from "../data/types/quality.ts";
import { QUALITIES } from "../data/types/quality.ts";

// Injectable so tests can assert exact outputs instead of statistical ranges
// (GDD agent-02/agent-03 contracts).
export type RandomFn = () => number;

export function rollQuality(resource: Resource, random: RandomFn = Math.random): QualityRoll {
  const roll = {} as QualityRoll;
  for (const quality of QUALITIES) {
    roll[quality] = resource.applicableQualities[quality] ? rollValue(random) : null;
  }
  return roll;
}

function rollValue(random: RandomFn): number {
  return Math.floor(random() * 100) + 1;
}
