using Profitable.Core.Adapters;

namespace ProfitableCore.Tests.Adapters;

// Mirrors tests/fixtures/audio.ts's TrackedVoice/createTrackedRegistry()
// -- records every voice created for each soundId, in creation order, so
// tests can inspect exactly which instances were started/stopped.
public class TrackedVoice : IAudioVoice
{
    public bool Started { get; private set; }
    public bool Stopped { get; private set; }

    public void Start() => Started = true;
    public void Stop() => Stopped = true;
}

public class TrackedRegistry
{
    private readonly Dictionary<string, List<TrackedVoice>> _created = new();
    public SoundRegistry Registry { get; } = new();

    public TrackedRegistry(params string[] soundIds)
    {
        foreach (var soundId in soundIds)
        {
            _created[soundId] = new List<TrackedVoice>();
            Registry[soundId] = () =>
            {
                var voice = new TrackedVoice();
                _created[soundId].Add(voice);
                return voice;
            };
        }
    }

    public IReadOnlyList<TrackedVoice> VoicesFor(string soundId) =>
        _created.TryGetValue(soundId, out var voices) ? voices : Array.Empty<TrackedVoice>();
}
