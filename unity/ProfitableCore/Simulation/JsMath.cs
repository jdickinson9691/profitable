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
}
