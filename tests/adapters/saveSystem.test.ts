import { test } from "node:test";
import assert from "node:assert/strict";
import { createLocalStorageSaveSystem } from "../../src/adapters/saveSystem.ts";
import { createMemoryStorage } from "../fixtures/storage.ts";

test("SaveSystem.save() then .load() round-trips data correctly", () => {
  const storage = createMemoryStorage();
  const saveSystem = createLocalStorageSaveSystem(storage);

  saveSystem.save("player", { name: "Vex", credits: 4200, tags: ["crafter", "gold"] });

  assert.deepEqual(saveSystem.load("player"), {
    name: "Vex",
    credits: 4200,
    tags: ["crafter", "gold"],
  });
});

test("SaveSystem.save() actually writes through the injected storage backend", () => {
  const storage = createMemoryStorage();
  const saveSystem = createLocalStorageSaveSystem(storage);

  saveSystem.save("x", 42);

  // Confirms this goes through StorageLike.setItem as a JSON string, not a
  // parallel in-memory structure of its own.
  assert.equal(storage.getItem("x"), "42");
});

test("SaveSystem.load() returns null for a key that was never saved", () => {
  const saveSystem = createLocalStorageSaveSystem(createMemoryStorage());
  assert.equal(saveSystem.load("missing"), null);
});
