namespace Profitable.Core.Schema;

// Ports src/data/types/resourceInstance.ts. Necessary completion (see
// agent-32-unity-simulation-core.md's Outputs Section 1) -- a concrete,
// rolled batch of a Resource, what Refine()/Craft() actually consume.
// Multiple instances of the same Resource can carry different rolled
// qualities (different gathering rolls), so quality lives per instance,
// not per Resource.
public class ResourceInstance
{
    public Resource Resource { get; set; } = new();
    public int Quantity { get; set; }
    public QualityMap Qualities { get; set; } = new();
}
