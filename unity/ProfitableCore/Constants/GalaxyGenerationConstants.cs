namespace Profitable.Core.Constants;

// Ports src/galaxy/generateGalaxy.ts's exported POSITION_RANGE. The
// galaxy's real coordinate bound -- positions aren't range/distribution-
// specified in the design, this is a documented default (a bounded
// square, uniform random), not a literal requirement. Load-bearing: this
// exact value is what ship.md's "Blue is the first always-reachable-in-
// one-hop tier" regression test (tests/ships/calculateFuelCost.test.ts)
// verifies FUEL_CAPACITY_BY_TIER against, so it must port to the same
// value, never re-guessed independently.
public static class GalaxyGenerationConstants
{
    public const int PositionRange = 1000;
}
