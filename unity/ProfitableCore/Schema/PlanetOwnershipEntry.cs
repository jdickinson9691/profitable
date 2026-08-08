namespace Profitable.Core.Schema;

// Ports src/data/types/planetOwnershipEntry.ts. One entry per planet that
// has ever had colonists transported -- planets with no entry are treated
// as Default() (0 colonists), never requiring an entry to exist just to
// read a planet's ownership state.
//
// Retroactive removal (2026-08-04): CitadelLevel/OwnedByPlayerId removed
// along with the whole Citadels sub-system -- see planet-ownership.md's
// own retroactive note for the full account. Colonist-Driven Production
// is unaffected; it never depended on Citadels for anything.
public class PlanetOwnershipEntry
{
    public int ColonistCount { get; set; }

    public static PlanetOwnershipEntry Default() => new() { ColonistCount = 0 };
}
