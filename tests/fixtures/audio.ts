import type { AudioVoiceLike, SoundRegistry } from "../../src/adapters/audioManager.ts";

export interface TrackedVoice extends AudioVoiceLike {
  started: boolean;
  stopped: boolean;
}

function createTrackedVoice(): TrackedVoice {
  const voice: TrackedVoice = {
    started: false,
    stopped: false,
    start() {
      voice.started = true;
    },
    stop() {
      voice.stopped = true;
    },
  };
  return voice;
}

// Records every voice created for each soundId, in creation order, so
// tests can inspect exactly which instances were started/stopped --
// mirrors the real constraint that each play() needs a fresh
// AudioBufferSourceNode.
export function createTrackedRegistry(soundIds: string[]): {
  registry: SoundRegistry;
  voicesFor(soundId: string): TrackedVoice[];
} {
  const created = new Map<string, TrackedVoice[]>();
  const registry: SoundRegistry = {};
  for (const soundId of soundIds) {
    created.set(soundId, []);
    registry[soundId] = () => {
      const voice = createTrackedVoice();
      created.get(soundId)?.push(voice);
      return voice;
    };
  }
  return {
    registry,
    voicesFor: (soundId) => created.get(soundId) ?? [],
  };
}
