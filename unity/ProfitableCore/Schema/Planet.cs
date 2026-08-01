namespace Profitable.Core.Schema;

// Ports src/data/types/planet.ts -- MVP-required fields only. The
// TypeScript source documents its own MVP-vs-Phase-2 split explicitly:
// "MVP fields (id, name, producibleResourceIds) stay required and
// unchanged. Phase 2 fields are optional". Deliberately excludes every
// Phase 2+ optional field (PlanetType, Tier, Position, SpecialtyResourceId,
// Discovered) -- out of scope for Migration Phase 1 per
// agent-31-unity-data-schema.md's scope note.
public class Planet
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<string> ProducibleResourceIds { get; set; } = new();
}
