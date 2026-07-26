import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { collectTsFiles } from "../fixtures/sourceFiles.ts";

// Agent 4's own testing requirement: confirm no file outside its own
// implementation files calls localStorage or Audio()/Web Audio directly
// (GDD Section 4's browser-API isolation mandate). Shared across
// SaveSystem and AudioManager rather than duplicated per-adapter, since
// it's one architectural rule, not two.
const SRC_DIR = join(import.meta.dirname, "../../src");

function findOffenders(pattern: RegExp): string[] {
  return collectTsFiles(SRC_DIR)
    .filter((file) => !relative(SRC_DIR, file).startsWith(`adapters${sep}`))
    .filter((file) => pattern.test(readFileSync(file, "utf8")));
}

test("no file outside src/adapters calls localStorage directly", () => {
  assert.deepEqual(findOffenders(/\blocalStorage\b/), []);
});

test("no file outside src/adapters calls Audio() or references Web Audio directly", () => {
  assert.deepEqual(findOffenders(/\bnew Audio\(|\bAudioContext\b/), []);
});
