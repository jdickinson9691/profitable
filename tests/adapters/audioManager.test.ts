import { test } from "node:test";
import assert from "node:assert/strict";
import { createWebAudioManager } from "../../src/adapters/audioManager.ts";
import { createTrackedRegistry } from "../fixtures/audio.ts";

test("AudioManager.play() creates and starts a fresh voice", () => {
  const { registry, voicesFor } = createTrackedRegistry(["gather-chime"]);
  const audio = createWebAudioManager(registry);

  audio.play("gather-chime");

  const voices = voicesFor("gather-chime");
  assert.equal(voices.length, 1);
  assert.equal(voices[0].started, true);
  assert.equal(voices[0].stopped, false);
});

test("AudioManager.play() on an already-playing sound stops the previous voice first", () => {
  const { registry, voicesFor } = createTrackedRegistry(["gather-chime"]);
  const audio = createWebAudioManager(registry);

  audio.play("gather-chime");
  audio.play("gather-chime");

  const voices = voicesFor("gather-chime");
  assert.equal(voices.length, 2); // a fresh node per play() -- one-shot semantics
  assert.equal(voices[0].stopped, true); // the first voice was cut off
  assert.equal(voices[1].started, true);
  assert.equal(voices[1].stopped, false);
});

test("AudioManager.stop() stops the active voice for that sound", () => {
  const { registry, voicesFor } = createTrackedRegistry(["gather-chime"]);
  const audio = createWebAudioManager(registry);

  audio.play("gather-chime");
  audio.stop("gather-chime");

  assert.equal(voicesFor("gather-chime")[0].stopped, true);
});

test("AudioManager.stop() on a sound that isn't playing is a safe no-op", () => {
  const { registry } = createTrackedRegistry(["gather-chime"]);
  const audio = createWebAudioManager(registry);

  assert.doesNotThrow(() => audio.stop("gather-chime"));
});

test("AudioManager.play() throws for an unregistered sound id", () => {
  const { registry } = createTrackedRegistry(["gather-chime"]);
  const audio = createWebAudioManager(registry);

  assert.throws(() => audio.play("unknown-sound"));
});
