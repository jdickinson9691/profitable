namespace Profitable.Core.Simulation;

// A rounding-semantics fix found during porting, not present in the
// original TypeScript source (see agent-32-unity-simulation-core.md's
// Outputs Section 3 for the full explanation): JavaScript's Math.round()
// rounds an exact .5 up (toward +Infinity) unconditionally, while C#'s
// Math.Round(double) defaults to banker's rounding (round-half-to-even).
// Every quality value in this domain is positive (1-100 range), so for
// this domain, "round half up" and "round half away from zero" are
// equivalent -- MidpointRounding.AwayFromZero reproduces JS's Math.round()
// behavior exactly. Every Math.Round() call anywhere in the ported
// refine()/craft() logic must go through this helper, never a bare
// Math.Round() call, so this fix can't be silently lost in a future edit.
public static class JsMath
{
    public static double Round(double value) => Math.Round(value, MidpointRounding.AwayFromZero);

    // General-signed-domain version, found necessary in Migration Phase 2
    // (agent-39-unity-galaxy-planet-simulation-core.md): Round() above is
    // only correct for the always-positive 1-100 quality domain it was
    // originally written for. JS's Math.round() rounds every exact .5
    // toward +Infinity regardless of sign (Math.round(-0.5) === 0,
    // Math.round(-1.5) === -1) -- AwayFromZero rounds a negative .5 the
    // opposite direction (AwayFromZero(-0.5) == -1), which would silently
    // mis-generate planet positions (a signed -1000..1000 range) on the
    // rare seed that lands exactly on a .5 boundary. Math.Floor(x + 0.5)
    // reproduces the ECMAScript spec's actual algorithm for any sign, not
    // just an approximation for the positive case.
    public static double RoundSigned(double value) => Math.Floor(value + 0.5);
}
