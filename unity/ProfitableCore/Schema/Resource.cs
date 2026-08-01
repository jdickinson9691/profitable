namespace Profitable.Core.Schema;

// Ports src/data/types/resource.ts. MVP scope, with one deliberate
// exception: ItemTier (a Phase 3 addition) is included because the real
// content/resources.json sets it on all 60 resources -- excluding it
// would make ContentLoader unable to parse the actual current content
// files (see agent-31-unity-data-schema.md's scope note). No Phase 3
// *behavior* (trading logic) is implemented around it -- it is carried
// as data only, same as the TypeScript source's own optional field.
public class Resource
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;

    // All 5 qualities are required keys -- a resource where a quality
    // doesn't apply still states `false` here, exactly like the
    // TypeScript `Record<Quality, boolean>` (which TypeScript's structural
    // typing requires to be total, not partial).
    public Dictionary<Quality, bool> ApplicableQualities { get; set; } = new();

    // 1-7, Phase 3's item-tier number (raw/refined/crafted). Optional --
    // MVP-era content that doesn't set it still validates.
    public int? ItemTier { get; set; }
}
