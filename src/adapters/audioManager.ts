export interface AudioManager {
  play(soundId: string): void;
  stop(soundId: string): void;
  // Alpha Section 4 settings screen: "audio on/off toggle, wired to the
  // existing AudioManager." A mute switch belongs on the adapter itself
  // (the one place allowed to know about the underlying audio stack), not
  // reimplemented in presentation code by conditionally skipping play()
  // calls -- that would leave every future play() call site responsible
  // for remembering to check a flag, easy to miss one.
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
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

export function createWebAudioManager(registry: SoundRegistry, initiallyEnabled = true): AudioManager {
  const activeVoices = new Map<string, AudioVoiceLike>();
  let enabled = initiallyEnabled;

  return {
    play(soundId) {
      // Muted: silently no-ops rather than throwing on an unregistered id
      // check first -- disabled audio should behave as if play() was never
      // called at all, not surface an error a caller has to guard against.
      if (!enabled) return;
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
    setEnabled(next) {
      enabled = next;
      // Muting mid-playback stops whatever's currently audible too, not
      // just future play() calls -- otherwise a sound already in flight
      // would keep playing until it ends on its own.
      if (!enabled) {
        for (const voice of activeVoices.values()) voice.stop();
        activeVoices.clear();
      }
    },
    isEnabled() {
      return enabled;
    },
  };
}
