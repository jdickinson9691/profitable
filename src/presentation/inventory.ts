import type { QualityRoll } from "../data/types/quality.ts";

// Session/persisted inventory state -- pure and framework-agnostic (no
// Phaser), so it's directly unit-testable, matching src/simulation's
// pure-function style. Each gather roll is its own batch (quality varies
// per roll), never aggregated into one running total, so refine()/craft()
// can see each batch's real qualities.
export interface InventoryBatch {
  resourceId: string;
  quantity: number;
  qualities: QualityRoll;
}

export type Inventory = InventoryBatch[];

export function createEmptyInventory(): Inventory {
  return [];
}

export function addBatch(inventory: Inventory, batch: InventoryBatch): Inventory {
  return [...inventory, batch];
}

export function totalQuantity(inventory: Inventory, resourceId: string): number {
  return inventory
    .filter((batch) => batch.resourceId === resourceId)
    .reduce((sum, batch) => sum + batch.quantity, 0);
}

export interface ConsumeResult {
  inventory: Inventory;
  consumed: InventoryBatch[];
}

// Consumes `amount` units of `resourceId`, oldest batch first, splitting a
// batch when only part of it is needed. Throws if the inventory doesn't
// have enough -- callers should check totalQuantity() first to decide
// whether an action (e.g. "Refine") should even be enabled.
export function consume(inventory: Inventory, resourceId: string, amount: number): ConsumeResult {
  if (amount <= 0) {
    return { inventory, consumed: [] };
  }
  if (totalQuantity(inventory, resourceId) < amount) {
    throw new Error(
      `not enough ${resourceId}: need ${amount}, have ${totalQuantity(inventory, resourceId)}`,
    );
  }

  const consumed: InventoryBatch[] = [];
  const remaining: Inventory = [];
  let stillNeeded = amount;

  for (const batch of inventory) {
    if (batch.resourceId !== resourceId || stillNeeded <= 0) {
      remaining.push(batch);
      continue;
    }
    if (batch.quantity <= stillNeeded) {
      consumed.push(batch);
      stillNeeded -= batch.quantity;
    } else {
      consumed.push({ ...batch, quantity: stillNeeded });
      remaining.push({ ...batch, quantity: batch.quantity - stillNeeded });
      stillNeeded = 0;
    }
  }

  return { inventory: remaining, consumed };
}
