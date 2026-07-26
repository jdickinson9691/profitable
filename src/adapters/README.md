# src/adapters

Owned by the **Infrastructure/Adapter Agent** (GDD §5.2, agent 4).

The browser-API isolation layer mandated by GDD §4: `SaveSystem` and
`AudioManager` interfaces, each with one concrete browser-backed
implementation, plus a stub `NetworkAdapter`. No other module anywhere in
the codebase may call `localStorage`/`Audio()`/Web Audio directly — it goes
through one of these interfaces instead.

No gameplay logic, and no imports from `src/simulation`.

**Status: complete.** All three outputs exist:

- `saveSystem.ts` — the `SaveSystem` interface plus
  `createLocalStorageSaveSystem()`, a factory that JSON-serializes through
  an injectable `StorageLike` backend (`getItem`/`setItem`), defaulting to
  the real global `localStorage` (accessed via a type assertion, not
  lib.dom's ambient types, so DOM globals stay type-invisible everywhere
  outside this file). Node's own `localStorage` needs
  `--experimental-webstorage` plus a file-backed store, impractical for
  tests — the injectable backend sidesteps that; tests supply an in-memory
  fake (`tests/fixtures/storage.ts`).
- `audioManager.ts` — the `AudioManager` interface plus
  `createWebAudioManager()`, backed by an injectable `SoundRegistry`
  (soundId → factory producing a fresh `AudioVoiceLike`). Modeled as a
  factory-per-sound rather than one reusable instance because real Web
  Audio `AudioBufferSourceNode`s are one-shot — a new node must be created
  every time a sound plays again, and `play()` on an already-playing sound
  stops the old voice first. Tests inject a fake voice registry that tracks
  start/stop calls (`tests/fixtures/audio.ts`) instead of needing a real
  browser audio stack.
- `networkAdapter.ts` — the `NetworkAdapter` interface (`connect`/`send`/
  `disconnect`) plus `createStubNetworkAdapter()`, a genuine no-op per the
  contract ("does not need to do anything functional yet") — built now so
  a real WebSocket-backed implementation costs nothing to add later,
  without touching any call site.

`tests/adapters/browserApiIsolation.test.ts` is the shared architectural
check (not duplicated per-adapter): walks `src/`, asserts nothing outside
this folder references `localStorage`, `new Audio(`, or `AudioContext`.
