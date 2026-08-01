namespace Profitable.Core.Adapters;

// Ports src/adapters/audioManager.ts's AudioVoiceLike -- minimal shape of
// a one-shot playable voice. A real Unity AudioSource-backed voice
// (Agent 35) satisfies this structurally, same relationship
// AudioVoiceLike has to a real Web Audio AudioBufferSourceNode.
public interface IAudioVoice
{
    void Start();
    void Stop();
}

// Ports the `() => AudioVoiceLike` factory shape. Web Audio (and Unity
// AudioSource) voices are one-shot: once started (and stopped or ended),
// a *new* voice must be created to play again -- so this maps each sound
// to a factory that creates a fresh voice per Play() call, not a single
// reusable instance.
public delegate IAudioVoice AudioVoiceFactory();

// Ports SoundRegistry (`Record<string, () => AudioVoiceLike>`).
public class SoundRegistry : Dictionary<string, AudioVoiceFactory>
{
}

// Ports src/adapters/audioManager.ts's AudioManager interface, including
// the Alpha Section 4 mute addition. A mute switch belongs on the
// adapter itself (the one place allowed to know about the underlying
// audio stack), not reimplemented in presentation code by conditionally
// skipping Play() calls.
public interface IAudioManager
{
    void Play(string soundId);
    void Stop(string soundId);
    void SetEnabled(bool enabled);
    bool IsEnabled();
}

// Ports createWebAudioManager()'s logic exactly -- real, tested state
// machine, not a stub. Only the concrete voice factories plugged into
// the SoundRegistry need to be Unity-specific (Agent 35); this class
// never touches an audio API directly, same as the TypeScript source.
public class RegistryAudioManager : IAudioManager
{
    private readonly SoundRegistry _registry;
    private readonly Dictionary<string, IAudioVoice> _activeVoices = new();
    private bool _enabled;

    public RegistryAudioManager(SoundRegistry registry, bool initiallyEnabled = true)
    {
        _registry = registry;
        _enabled = initiallyEnabled;
    }

    public void Play(string soundId)
    {
        // Muted: silently no-ops rather than throwing on an unregistered
        // id check first -- disabled audio should behave as if Play()
        // was never called at all, not surface an error a caller has to
        // guard against.
        if (!_enabled) return;

        if (!_registry.TryGetValue(soundId, out var createVoice))
        {
            throw new ArgumentException($"no sound registered for id \"{soundId}\"", nameof(soundId));
        }

        // A sound already playing gets cut off by a fresh Play() -- stop
        // the old voice before starting the new one.
        if (_activeVoices.TryGetValue(soundId, out var existing))
        {
            existing.Stop();
        }

        var voice = createVoice();
        _activeVoices[soundId] = voice;
        voice.Start();
    }

    public void Stop(string soundId)
    {
        if (_activeVoices.TryGetValue(soundId, out var voice))
        {
            voice.Stop();
            _activeVoices.Remove(soundId);
        }
    }

    public void SetEnabled(bool enabled)
    {
        _enabled = enabled;

        // Muting mid-playback stops whatever's currently audible too,
        // not just future Play() calls -- otherwise a sound already in
        // flight would keep playing until it ends on its own.
        if (!_enabled)
        {
            foreach (var voice in _activeVoices.Values)
            {
                voice.Stop();
            }
            _activeVoices.Clear();
        }
    }

    public bool IsEnabled() => _enabled;
}
