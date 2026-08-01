# Agent 34: Unity Infrastructure Adapters Agent

**Creation order:** Independent of Agents 32/33 — can run in parallel with them (in practice, built after, same as Agent 33, since this migration is one agent working sequentially across sessions rather than literally parallel agents). Must exist before Agent 35 (Unity MVP Presentation) starts.

## Responsibility

Port Agent 4's browser-API isolation layer (`docs/agents/agent-04-infrastructure-adapter.md`) to C#: the `SaveSystem` and `AudioManager` interfaces, plus concrete implementations. This is what keeps Agent 35's Unity scenes from ever touching a persistence or audio API directly — the same purpose Agent 4's isolation layer served for Phaser, now for Unity.

**Scope: `SaveSystem`/`AudioManager` only, not `NetworkAdapter`.** Agent 4's original contract also produced a `NetworkAdapter` stub, explicitly marked "not required for MVP functionality" even in the original TypeScript build. The migration GDD's Section 5.1 roster line for this agent names only `SaveSystem`/`AudioManager`, consistent with that same MVP-only framing — carried through by omission, not by accident. `NetworkAdapter`'s Unity port is deferred to whichever future migration phase needs it (multiplayer-adjacent, per `CLAUDE.md`'s Multiplayer section), not this one.

**Scope: real Unity-backend implementations are deferred to Agent 35, not stubbed here.** Agents 31-33 established (and `unity/README.md` documents) that this migration stays Unity-Editor-free through Agent 34 — Editor dependency begins at Agent 35. `PlayerPrefs` and Unity's audio system (`AudioSource`/`AudioClip`) are both real `UnityEngine` APIs that don't exist without a Unity install, which this environment doesn't have (see Agent 31's own tooling-gap note for the equivalent `dotnet` SDK situation). This agent's job is to build everything that *doesn't* require `UnityEngine` — the interfaces, and every piece of adapter *logic* — so that Agent 35 only has to plug in the literal `UnityEngine` calls, exactly the "swap the concrete implementation, zero call-site changes" property Agent 4's own Definition of Done already required. Concretely:
- `SaveSystem`: the GDD's own parenthetical names two acceptable backends, "file I/O or `PlayerPrefs`." File I/O needs only `System.IO`, which is real, portable .NET (works identically inside Unity's Mono/IL2CPP runtime) — no `UnityEngine` dependency at all. This agent builds a genuine, fully-functional file-backed `SaveSystem`, not a stub, with an injectable base directory so a test uses a temp directory and Agent 35 passes `Application.persistentDataPath` — the exact same seam the existing Electron `SaveSystem` swap (`src/adapters/electronSaveSystem.ts`) already proved out once for this project.
- `AudioManager`: the TypeScript `createWebAudioManager()`'s own logic (play/stop/mute state machine) never touches Web Audio directly either — it operates entirely through an injected `SoundRegistry` of voice factories, the *caller* supplies the Web-Audio-specific parts. This agent ports that same logic, real and fully tested, through an equivalent injectable `IAudioVoice`/`SoundRegistry` seam. Only the concrete Unity `AudioSource`-backed voice factory is deferred to Agent 35 — the `AudioManager` state machine itself is complete here, not stubbed.

## Inputs

- `docs/agents/agent-04-infrastructure-adapter.md` — the original contract this agent ports.
- `src/adapters/saveSystem.ts`, `electronSaveSystem.ts` (the "swap implementation" precedent), `audioManager.ts`.
- `tests/adapters/saveSystem.test.ts`, `audioManager.test.ts`, and their fixtures (`tests/fixtures/storage.ts`, `audio.ts`) — for parity of test *behavior*, not literal reuse (this agent's own concrete backend is file-based, not the browser `Storage`-like abstraction those TypeScript fixtures wrap).

## Outputs

### 1. `Profitable.Core.Adapters` namespace

- `ISaveSystem`: `void Save(string key, object? data)`, `object? Load(string key)` — same two-method, JSON-round-trip shape as the TypeScript interface. `object?` (not a generic `Save<T>`/`Load<T>`) deliberately mirrors TypeScript's `unknown`-in/`unknown`-out contract: the caller casts/interprets the loaded value, same as every current TypeScript call site already does (e.g. `debugFlag.ts`'s `saveSystem.load(...) as boolean | null`). A generic API would be a real interface-shape change beyond "shape changes, meaning doesn't" (migration GDD Section 4) — not introduced without an actual consumer asking for it.
- `FileSaveSystem : ISaveSystem` — real `System.IO`-backed implementation, constructor-injected base directory (created if missing). Each key is written to its own JSON file. **Necessary completion:** TypeScript `Storage` keys (e.g. `"profitable:debugModeEnabled"`) can contain characters invalid in filenames on some platforms (`:` is illegal in a Windows filename) — the TypeScript interface never had to think about this since `localStorage`/Electron's IPC-based store both accept arbitrary string keys with no filesystem translation. A key-to-filename sanitizer (safe characters pass through, everything else becomes `_`) is added here, documented as a real behavior this agent introduces rather than silently assumed.
- `IAudioVoice`: `void Start()`, `void Stop()` — ports `AudioVoiceLike`.
- `AudioVoiceFactory`: `delegate IAudioVoice AudioVoiceFactory()` — ports the `() => AudioVoiceLike` factory shape.
- `SoundRegistry : Dictionary<string, AudioVoiceFactory>` — ports `SoundRegistry`.
- `IAudioManager`: `void Play(string soundId)`, `void Stop(string soundId)`, `void SetEnabled(bool enabled)`, `bool IsEnabled()` — ports `AudioManager`'s interface, including the Alpha Section 4 mute addition.
- `RegistryAudioManager : IAudioManager` — ports `createWebAudioManager()`'s logic exactly: play() stops any already-active voice for that sound id before starting a fresh one (one-shot voice semantics), stop() is a safe no-op on a sound that isn't playing, setEnabled(false) stops and clears every active voice (not just gates future play() calls), play() while disabled silently no-ops rather than throwing, play() on an unregistered sound id throws.

## Must NOT Do

- Must not implement `NetworkAdapter` — deliberately out of scope, see Responsibility.
- Must not add any `UnityEngine` reference or otherwise require the Unity Editor to build/test — that dependency begins at Agent 35. `dotnet build`/`dotnet test` must keep working exactly as they do for Agents 31-33.
- Must not implement any gameplay logic, quality/refining/crafting math, or rendering — same boundary as Agent 4's original contract.
- Must not reference anything from `Profitable.Core.Simulation`/`Schema`/`Content` — this agent has no knowledge of game rules, only of persistence/audio mechanics, same as Agent 4.
- Must not silently drop the mute-stops-active-voices behavior, the fresh-voice-per-play() one-shot semantics, or the unregistered-sound-id throw — these are the specific behaviors `audioManager.ts`'s own comments call out as deliberate, not incidental.

## Testing Requirements

- `FileSaveSystem` tests mirroring `saveSystem.test.ts`'s three cases (round-trips data correctly; a saved value is actually readable as its serialized JSON form, not just through a parallel in-memory structure; load() of a never-saved key returns null) against a real temp directory (same pattern as `ProfitableCore.Tests/Content/ContentLoaderRealFilesTests.cs`'s own real-file-I/O tests), not a fake/in-memory file system.
- `RegistryAudioManager` tests mirroring `audioManager.test.ts`'s five cases (play creates and starts a fresh voice; play on an already-playing sound stops the previous voice first; stop stops the active voice; stop on a non-playing sound is a safe no-op; play on an unregistered id throws), using a tracked test-double `IAudioVoice`/`SoundRegistry` mirroring `tests/fixtures/audio.ts`'s `createTrackedRegistry()`.
- `SetEnabled`/`IsEnabled` tests with no TypeScript unit-test file to mirror (that behavior was verified in-browser during Alpha Section 4, not via a Node unit test — see `CLAUDE.md`'s own note on the debug/tuning panel work) — written directly from `audioManager.ts`'s documented behavior instead: muting stops every currently-active voice, not just future `play()` calls; `play()` while muted is a silent no-op, not an error.

## Definition of Done

- `ISaveSystem`/`FileSaveSystem` and `IAudioManager`/`RegistryAudioManager` are implemented exactly per the current TypeScript source's documented behavior, built and tested without any Unity Editor dependency.
- `dotnet test` passes with zero failures.
- Swapping to the real Unity-backed concrete implementations (Agent 35) requires adding new files only — a `UnityFileSaveSystem`-equivalent constructed with `Application.persistentDataPath`, and a `SoundRegistry` populated with `AudioSource`-backed `IAudioVoice` factories — with zero changes to `ISaveSystem`, `IAudioManager`, `FileSaveSystem`, or `RegistryAudioManager` themselves, and zero changes to whatever future Agent 35/36 call sites use them, mirroring Agent 4's own Definition of Done for the Electron swap precedent.
- No later Phase 1 agent (35-36) should need to hardcode a persistence or audio behavior that belongs here — if they do, this agent's output is incomplete.
