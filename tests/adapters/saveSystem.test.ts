import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
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

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

test("no file outside src/adapters calls localStorage directly", () => {
  const srcDir = join(import.meta.dirname, "../../src");
  const offenders = collectTsFiles(srcDir)
    .filter((file) => !relative(srcDir, file).startsWith(`adapters${sep}`))
    .filter((file) => /\blocalStorage\b/.test(readFileSync(file, "utf8")));

  assert.deepEqual(offenders, []);
});
