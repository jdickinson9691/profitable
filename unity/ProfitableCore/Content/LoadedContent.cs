using Profitable.Core.Schema;

namespace Profitable.Core.Content;

// Ports src/simulation/loadContent.ts's LoadedContent interface.
public class LoadedContent
{
    public List<Resource> Resources { get; set; } = new();
    public List<Recipe> Recipes { get; set; } = new();
    public List<RefiningRecipe> RefiningRecipes { get; set; } = new();
    public List<Schematic> Schematics { get; set; } = new();
    public List<Planet> Planets { get; set; } = new();
}

// Ports loadContent()'s thrown Error -- carries every problem found (not
// just the first), matching "reports every invalid item across sections"
// (loadContent.test.ts). Message format mirrors the TypeScript source's
// own `${section}[${index}]: ${detail}` convention so problems remain
// greppable the same way.
public class ContentValidationException : Exception
{
    public IReadOnlyList<string> Problems { get; }

    public ContentValidationException(IReadOnlyList<string> problems)
        : base("ContentLoader: invalid config:\n" + string.Join("\n", problems.Select(p => "  - " + p)))
    {
        Problems = problems;
    }
}
