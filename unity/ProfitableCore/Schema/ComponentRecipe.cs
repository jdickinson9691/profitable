namespace Profitable.Core.Schema;

// Ports src/data/types/componentRecipe.ts. A small link table mapping a
// recipe id to the ComponentCategory its Crafter.Craft output represents
// -- the component recipes themselves are ordinary Recipe entries in
// content/recipes.json, loaded through the existing ContentLoader
// unchanged.
public class ComponentRecipe
{
    public string RecipeId { get; set; } = string.Empty;
    public ComponentCategory Category { get; set; }
}
