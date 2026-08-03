import type { PlanetOwnershipEntry } from "./planetOwnershipEntry.ts";

export interface ClaimPlanetSucceeded {
  success: true;
  updatedOwnershipEntry: PlanetOwnershipEntry;
}

export interface ClaimPlanetRejected {
  success: false;
  reason: string;
}

export type ClaimPlanetResult = ClaimPlanetSucceeded | ClaimPlanetRejected;
