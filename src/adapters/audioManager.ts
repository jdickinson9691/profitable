export interface AudioManager {
  play(soundId: string): void;
  stop(soundId: string): void;
}

// Minimal shape of a Web Audio AudioBufferSourceNode (its real `start`/
// `stop` methods) -- letting it be injectable means tests don't need a
// real browser audio stack. A real AudioBufferSourceNode satisfies this
// structurally (it has these methods plus more), same relationship as
// StorageLike has to the real Storage/localStorage object.
export interface AudioVoiceLike {
  start(): void;
  stop(): void;
}

// Web Audio buffer source nodes are one-shot: once started (and stopped or
// ended), a *new* node must be created to play again. So this maps each
// sound to a factory that creates a fresh voice per play() call, not a
// single reusable instance.
export type SoundRegistry = Record<string, () => AudioVoiceLike>;

export function createWebAudioManager(registry: SoundRegistry): AudioManager {
  const activeVoices = new Map<string, AudioVoiceLike>();

  return {
    play(soundId) {
      const createVoice = registry[soundId];
      if (!createVoice) {
        throw new Error(`no sound registered for id "${soundId}"`);
      }
      // A sound already playing gets cut off by a fresh play() -- stop the
      // old voice before starting the new one.
      activeVoices.get(soundId)?.stop();
      const voice = createVoice();
      activeVoices.set(soundId, voice);
      voice.start();
    },
    stop(soundId) {
      activeVoices.get(soundId)?.stop();
      activeVoices.delete(soundId);
    },
  };
}
