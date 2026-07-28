import type { ScannerCandidate } from "../data/types/scannerCandidate.ts";
import type { ScannerPool } from "../data/types/scannerPool.ts";
import type { Scanner } from "../data/types/scanner.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { PurchaseScannerResult } from "../data/types/purchaseScannerResult.ts";
import { SCANNER_PURCHASE_COST_BY_TIER } from "../data/constants/shipsAndTravelConfig.ts";

// Scanner/Probe GDD §2.2. Mirrors purchaseShip() exactly: takes the actual
// candidate/pool/wallet data directly rather than IDs into an implicit
// store (same pure-function reasoning applied throughout this codebase),
// checks wallet sufficiency before deducting, removes the candidate from
// its pool, and transfers ownership.
export function purchaseScanner(
  candidate: ScannerCandidate,
  pool: ScannerPool,
  wallet: Wallet,
  playerId: string,
): PurchaseScannerResult {
  if (!pool.availableScanners.some((entry) => entry.id === candidate.id)) {
    return { purchased: false, reason: "candidate is not in this planet's scanner pool" };
  }

  const cost = SCANNER_PURCHASE_COST_BY_TIER.find((entry) => entry.tier === candidate.tier)?.cost;
  if (cost === undefined) {
    throw new RangeError(`no purchase cost defined for tier ${candidate.tier}`);
  }
  if (wallet.credits < cost) {
    return { purchased: false, reason: `insufficient funds: need ${cost}, have ${wallet.credits}` };
  }

  const scanner: Scanner = { id: candidate.id, tier: candidate.tier, ownerId: playerId };

  return {
    purchased: true,
    scanner,
    updatedPool: {
      ...pool,
      availableScanners: pool.availableScanners.filter((entry) => entry.id !== candidate.id),
    },
    updatedWallet: { ...wallet, credits: wallet.credits - cost },
  };
}
