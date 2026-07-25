import type { QualityRoll } from "./quality.ts";

export interface CraftAccepted {
  accepted: true;
  qualities: QualityRoll;
}

export interface CraftRejected {
  accepted: false;
  // Human-readable explanation (e.g. which input, how far below threshold).
  reason: string;
}

export type CraftResult = CraftAccepted | CraftRejected;
