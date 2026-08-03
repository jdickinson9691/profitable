namespace Profitable.Core.Schema;

// Ports src/data/types/planet.ts's PlanetPosition. Integer-only, matching
// generatePosition()'s Math.round()-truncated output exactly -- never a
// double, which would silently admit fractional positions the TypeScript
// side can never produce.
public class PlanetPosition
{
    public int X { get; set; }
    public int Y { get; set; }
}
