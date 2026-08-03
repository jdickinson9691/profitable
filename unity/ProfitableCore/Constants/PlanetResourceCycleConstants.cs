namespace Profitable.Core.Constants;

// Ports src/data/constants/planetResourceCycle.ts.
public static class PlanetResourceCycleConstants
{
    // A planet's producible resources/specialty/qualities re-roll once per
    // this many hours, phase-offset per planet so planets don't all reset
    // in lockstep. Originated default, tunable in the TypeScript source --
    // this port takes the current value as a plain constant, not
    // independently re-tunable in C# yet (no debug panel exists here).
    public const int PlanetResourceResetIntervalHours = 168;

    // The starting-planet tutorial guarantee's 3 fixed resources -- the
    // exact MVP tutorial chain needs, named directly rather than derived
    // from any formula. Structural, not a balance knob.
    public static readonly IReadOnlyList<string> TutorialGuaranteedResourceIds = new[]
    {
        "igneous-ore",
        "autunite-crystal",
        "hydrogen-gas",
    };

    // The clamp value every dimension of a guaranteed resource is capped to
    // when it would otherwise aggregate above White -- White's own ceiling,
    // chosen so the clamped result always lands exactly at White, never
    // accidentally into Green. Structural, not a balance knob.
    public const int TutorialGuaranteeQualityClamp = 60;
}
