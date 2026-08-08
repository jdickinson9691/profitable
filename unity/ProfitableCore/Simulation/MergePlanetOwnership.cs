using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/planets/mergePlanetOwnership.ts. Merges a persisted
// planetOwnershipState entry onto a freshly-generated Planet at read time
// -- the same "normalize the live-read value, never trust the
// regenerated object's own field" pattern already established for
// Discovered. Pure function: the SaveSystem-backed lookup lives in the
// caller (Unity's PlanetOwnershipState.cs).
//
// Retroactive removal (2026-08-04): CitadelLevel/OwnedByPlayerId merging
// removed along with Citadels -- see planet-ownership.md's own
// retroactive note. ColonistCount merging is unaffected.
public static class PlanetOwnershipMerger
{
    public static Planet MergePlanetOwnership(Planet planet, PlanetOwnershipEntry? entry)
    {
        var resolved = entry ?? PlanetOwnershipEntry.Default();
        return new Planet
        {
            Id = planet.Id,
            Name = planet.Name,
            ProducibleResourceIds = planet.ProducibleResourceIds,
            PlanetType = planet.PlanetType,
            Tier = planet.Tier,
            Position = planet.Position,
            SpecialtyResourceId = planet.SpecialtyResourceId,
            Discovered = planet.Discovered,
            ResourceQualities = planet.ResourceQualities,
            ColonistCount = resolved.ColonistCount,
        };
    }
}
