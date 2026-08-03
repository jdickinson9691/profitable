namespace Profitable.Core.Schema;

// Ports src/data/types/planet.ts. MVP fields (Id/Name/ProducibleResourceIds)
// stay required and unchanged, exactly matching the TypeScript source's own
// "MVP fields stay required and unchanged. Phase 2 fields are optional"
// rule -- MVP-era content/save data must still be representable without
// modification. Phase 2+ fields (agent-38-unity-galaxy-planet-schema.md)
// are all nullable/optional for the same reason.
public class Planet
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<string> ProducibleResourceIds { get; set; } = new();

    public PlanetType? PlanetType { get; set; }
    public TierColor? Tier { get; set; }
    public PlanetPosition? Position { get; set; }
    public string? SpecialtyResourceId { get; set; }
    public bool? Discovered { get; set; }

    // Planet Resource Generation amendment: one fixed QualityMap per
    // ProducibleResourceIds entry, as of this planet's current resource
    // cycle. Keyed by resource id, mirroring the TypeScript
    // Record<string, QualityRoll>.
    public Dictionary<string, QualityMap>? ResourceQualities { get; set; }

    // Colonist-Driven Production / Citadels amendment (planet-ownership.md,
    // Sub-Phase E). These three are never set by GeneratePlanet() -- they
    // live exclusively in a persisted side-table and are merged onto a
    // Planet at read time, same as the TypeScript source. Schema'd here
    // (Sub-Phase A) even though the behavior that sets/reads most of them
    // is Sub-Phase E's scope, so Sub-Phase E never needs to reopen this
    // file.
    public int? ColonistCount { get; set; }
    public int? CitadelLevel { get; set; }
    public string? OwnedByPlayerId { get; set; }
}
