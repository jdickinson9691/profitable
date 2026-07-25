import type { Resource } from "../data/types/resource.ts";
import type { QualityRoll } from "../data/types/quality.ts";
import type { RandomFn } from "../data/types/random.ts";
import { QUALITIES } from "../data/types/quality.ts";

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
