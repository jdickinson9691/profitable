import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyInventory,
  addBatch,
  totalQuantity,
  consume,
} from "../../src/presentation/inventory.ts";
import type { Inventory } from "../../src/presentation/inventory.ts";

const oreQualities = { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 };

test("createEmptyInventory() starts empty", () => {
  assert.deepEqual(createEmptyInventory(), []);
});

test("addBatch() appends without mutating the original array", () => {
  const original = createEmptyInventory();
  const updated = addBatch(original, { resourceId: "igneous-ore", quantity: 1, qualities: oreQualities });

  assert.deepEqual(original, []);
  assert.equal(updated.length, 1);
});

test("totalQuantity() sums only the requested resource across multiple batches", () => {
  let inventory: Inventory = createEmptyInventory();
  inventory = addBatch(inventory, { resourceId: "igneous-ore", quantity: 1, qualities: oreQualities });
  inventory = addBatch(inventory, { resourceId: "igneous-ore", quantity: 2, qualities: oreQualities });
  inventory = addBatch(inventory, { resourceId: "hydrogen-gas", quantity: 5, qualities: oreQualities });

  assert.equal(totalQuantity(inventory, "igneous-ore"), 3);
  assert.equal(totalQuantity(inventory, "hydrogen-gas"), 5);
  assert.equal(totalQuantity(inventory, "autunite-crystal"), 0);
});

test("consume() removes a batch entirely on an exact match", () => {
  let inventory: Inventory = createEmptyInventory();
  inventory = addBatch(inventory, { resourceId: "igneous-ore", quantity: 2, qualities: oreQualities });

  const result = consume(inventory, "igneous-ore", 2);

  assert.equal(totalQuantity(result.inventory, "igneous-ore"), 0);
  assert.equal(result.consumed.length, 1);
  assert.equal(result.consumed[0]?.quantity, 2);
  assert.deepEqual(result.consumed[0]?.qualities, oreQualities);
});

test("consume() splits a batch when only part of it is needed", () => {
  let inventory: Inventory = createEmptyInventory();
  inventory = addBatch(inventory, { resourceId: "igneous-ore", quantity: 5, qualities: oreQualities });

  const result = consume(inventory, "igneous-ore", 2);

  assert.equal(result.consumed.length, 1);
  assert.equal(result.consumed[0]?.quantity, 2);
  assert.equal(totalQuantity(result.inventory, "igneous-ore"), 3);
  // the split-off remainder keeps the same rolled qualities
  assert.deepEqual(result.inventory[0]?.qualities, oreQualities);
});

test("consume() takes oldest batches first (FIFO), leaving newer batches untouched", () => {
  const firstBatchQualities = { ...oreQualities, purity: 10 };
  const secondBatchQualities = { ...oreQualities, purity: 90 };
  let inventory: Inventory = createEmptyInventory();
  inventory = addBatch(inventory, {
    resourceId: "igneous-ore",
    quantity: 1,
    qualities: firstBatchQualities,
  });
  inventory = addBatch(inventory, {
    resourceId: "igneous-ore",
    quantity: 1,
    qualities: secondBatchQualities,
  });

  const result = consume(inventory, "igneous-ore", 1);

  assert.equal(result.consumed.length, 1);
  assert.deepEqual(result.consumed[0]?.qualities, firstBatchQualities);
  assert.equal(result.inventory.length, 1);
  assert.deepEqual(result.inventory[0]?.qualities, secondBatchQualities);
});

test("consume() leaves other resources' batches untouched", () => {
  let inventory: Inventory = createEmptyInventory();
  inventory = addBatch(inventory, { resourceId: "igneous-ore", quantity: 2, qualities: oreQualities });
  inventory = addBatch(inventory, { resourceId: "hydrogen-gas", quantity: 3, qualities: oreQualities });

  const result = consume(inventory, "igneous-ore", 2);

  assert.equal(totalQuantity(result.inventory, "hydrogen-gas"), 3);
});

test("consume() throws when the inventory doesn't have enough", () => {
  let inventory: Inventory = createEmptyInventory();
  inventory = addBatch(inventory, { resourceId: "igneous-ore", quantity: 1, qualities: oreQualities });

  assert.throws(() => consume(inventory, "igneous-ore", 2));
});

test("consume() with amount 0 is a no-op", () => {
  let inventory: Inventory = createEmptyInventory();
  inventory = addBatch(inventory, { resourceId: "igneous-ore", quantity: 1, qualities: oreQualities });

  const result = consume(inventory, "igneous-ore", 0);

  assert.equal(result.consumed.length, 0);
  assert.equal(totalQuantity(result.inventory, "igneous-ore"), 1);
});
