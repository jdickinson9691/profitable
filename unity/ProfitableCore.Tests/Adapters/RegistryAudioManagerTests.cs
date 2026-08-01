using Profitable.Core.Adapters;

namespace ProfitableCore.Tests.Adapters;

// Mirrors tests/adapters/audioManager.test.ts case-for-case, plus
// SetEnabled/IsEnabled coverage that has no TypeScript unit test to
// mirror (verified in-browser only during Alpha Section 4 -- see
// agent-34-unity-infrastructure-adapters.md's Testing Requirements).
public class RegistryAudioManagerTests
{
    [Fact]
    public void PlayCreatesAndStartsAFreshVoice()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry);

        audio.Play("gather-chime");

        var voices = tracked.VoicesFor("gather-chime");
        Assert.Single(voices);
        Assert.True(voices[0].Started);
        Assert.False(voices[0].Stopped);
    }

    [Fact]
    public void PlayOnAnAlreadyPlayingSoundStopsThePreviousVoiceFirst()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry);

        audio.Play("gather-chime");
        audio.Play("gather-chime");

        var voices = tracked.VoicesFor("gather-chime");
        Assert.Equal(2, voices.Count); // a fresh voice per Play() -- one-shot semantics
        Assert.True(voices[0].Stopped); // the first voice was cut off
        Assert.True(voices[1].Started);
        Assert.False(voices[1].Stopped);
    }

    [Fact]
    public void StopStopsTheActiveVoiceForThatSound()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry);

        audio.Play("gather-chime");
        audio.Stop("gather-chime");

        Assert.True(tracked.VoicesFor("gather-chime")[0].Stopped);
    }

    [Fact]
    public void StopOnASoundThatIsNotPlayingIsASafeNoOp()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry);

        var exception = Record.Exception(() => audio.Stop("gather-chime"));
        Assert.Null(exception);
    }

    [Fact]
    public void PlayThrowsForAnUnregisteredSoundId()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry);

        Assert.Throws<ArgumentException>(() => audio.Play("unknown-sound"));
    }

    [Fact]
    public void IsEnabledDefaultsToTrue()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry);
        Assert.True(audio.IsEnabled());
    }

    [Fact]
    public void PlayWhileDisabledIsASilentNoOp()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry);

        audio.SetEnabled(false);
        var exception = Record.Exception(() => audio.Play("gather-chime"));

        Assert.Null(exception);
        Assert.Empty(tracked.VoicesFor("gather-chime"));
    }

    [Fact]
    public void SetEnabledFalseStopsEveryCurrentlyActiveVoiceNotJustFuturePlayCalls()
    {
        var tracked = new TrackedRegistry("gather-chime", "craft-success");
        var audio = new RegistryAudioManager(tracked.Registry);

        audio.Play("gather-chime");
        audio.Play("craft-success");
        audio.SetEnabled(false);

        Assert.True(tracked.VoicesFor("gather-chime")[0].Stopped);
        Assert.True(tracked.VoicesFor("craft-success")[0].Stopped);
    }

    [Fact]
    public void SetEnabledTrueAfterFalseAllowsPlayAgain()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry);

        audio.SetEnabled(false);
        audio.SetEnabled(true);
        audio.Play("gather-chime");

        Assert.True(audio.IsEnabled());
        Assert.Single(tracked.VoicesFor("gather-chime"));
    }

    [Fact]
    public void InitiallyEnabledConstructorParameterIsRespected()
    {
        var tracked = new TrackedRegistry("gather-chime");
        var audio = new RegistryAudioManager(tracked.Registry, initiallyEnabled: false);

        Assert.False(audio.IsEnabled());
        audio.Play("gather-chime");
        Assert.Empty(tracked.VoicesFor("gather-chime"));
    }
}
