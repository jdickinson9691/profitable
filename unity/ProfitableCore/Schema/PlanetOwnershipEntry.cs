namespace Profitable.Core.Schema;

// Ports src/data/types/planetOwnershipEntry.ts. One entry per planet that
// has ever had colonists transported, been claimed, or had a Citadel
// built -- planets with no entry are treated as Default() (0 colonists,
// no citadel, unowned), never requiring an entry to exist just to read a
// planet's ownership state.
public class PlanetOwnershipEntry
{
    public int ColonistCount { get; set; }
    public int CitadelLevel { get; set; }
    public string? OwnedByPlayerId { get; set; }

    public static PlanetOwnershipEntry Default() => new() { ColonistCount = 0, CitadelLevel = 0, OwnedByPlayerId = null };
}
