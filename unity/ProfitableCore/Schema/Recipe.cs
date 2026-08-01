namespace Profitable.Core.Schema;

// Ports src/data/types/recipe.ts.
public class RecipeInput
{
    public string Category { get; set; } = string.Empty;
    public int Quantity { get; set; }

    // Both present together, or both absent -- no threshold requirement
    // for this slot. TypeScript expresses this via two independently
    // optional fields plus the JSON schema's `dependencies` keyword; C#
    // has no built-in "dependent optional fields" shape, so this
    // invariant is enforced explicitly by ContentLoader, not by the type
    // itself (see ContentLoader.cs).
    public Quality? ThresholdQuality { get; set; }
    public int? ThresholdValue { get; set; }
}

public class Recipe
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    // Matched positionally against craft()'s `inputs` array (Agent 32's
    // concern, not this agent's -- ported here only as data shape).
    public List<RecipeInput> Inputs { get; set; } = new();
    public string OutputResourceId { get; set; } = string.Empty;
    public int OutputQuantity { get; set; }
}
