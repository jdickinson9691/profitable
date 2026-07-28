import type { Scanner } from "./scanner.ts";
import type { ScannerPool } from "./scannerPool.ts";
import type { Wallet } from "./wallet.ts";

// Necessary completion, same precedent as PurchaseShipResult: the Scanner
// GDD amendment names `purchaseScanner(scannerId, playerId): Scanner |
// PurchaseError` but never defines PurchaseError, and a bare Scanner
// return on success can't also carry the updated pool/wallet a pure
// function must return alongside it.
export interface PurchaseScannerSucceeded {
  purchased: true;
  scanner: Scanner;
  updatedPool: ScannerPool;
  updatedWallet: Wallet;
}

export interface PurchaseScannerRejected {
  purchased: false;
  reason: string;
}

export type PurchaseScannerResult = PurchaseScannerSucceeded | PurchaseScannerRejected;
