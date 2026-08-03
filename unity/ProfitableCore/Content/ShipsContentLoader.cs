using System.Text.Json.Nodes;
using Profitable.Core.Schema;

namespace Profitable.Core.Content;

// Ports src/ships/loadShipsContent.ts. Validation-rule translation, not
// schema-file reuse -- same reasoning as ContentLoader/TradingContentLoader.
// ComponentRecipes is the only section here -- the component recipes
// themselves are ordinary Recipe entries in content/recipes.json, loaded
// through the existing ContentLoader unchanged.
public static class ShipsContentLoader
{
    public sealed class LoadedShipsContent
    {
        public List<ComponentRecipe> ComponentRecipes { get; init; } = new();
    }

    public static LoadedShipsContent Load(JsonNode? rawConfig)
    {
        if (rawConfig is not JsonObject root || root["componentRecipes"] is not JsonArray array)
        {
            throw new ContentValidationException(new[] { "root: expected an object with a componentRecipes array" });
        }

        var problems = new List<string>();
        var componentRecipes = new List<ComponentRecipe>();
        for (var i = 0; i < array.Count; i++)
        {
            var path = $"componentRecipes[{i}]";
            if (array[i] is not JsonObject itemObject)
            {
                problems.Add($"{path}: expected an object");
                continue;
            }

            var itemProblems = new List<string>();
            var recipeId = RequireNonEmptyString(itemObject, "recipeId", itemProblems);

            ComponentCategory? category = null;
            var rawCategory = itemObject["category"]?.GetValue<string>();
            if (rawCategory is null || !TryParseCategory(rawCategory, out var parsedCategory))
            {
                itemProblems.Add("category is not a valid ComponentCategory");
            }
            else
            {
                category = parsedCategory;
            }

            if (HasUnknownKeys(itemObject, "recipeId", "category"))
            {
                itemProblems.Add("unknown top-level field");
            }

            if (itemProblems.Count > 0)
            {
                problems.Add($"{path}: {string.Join("; ", itemProblems)}");
                continue;
            }

            componentRecipes.Add(new ComponentRecipe { RecipeId = recipeId!, Category = category!.Value });
        }

        if (problems.Count > 0)
        {
            throw new ContentValidationException(problems);
        }

        return new LoadedShipsContent { ComponentRecipes = componentRecipes };
    }

    public static LoadedShipsContent LoadFromFile(string componentRecipesPath)
    {
        var text = File.ReadAllText(componentRecipesPath);
        var merged = new JsonObject { ["componentRecipes"] = JsonNode.Parse(text) };
        return Load(merged);
    }

    private static string? RequireNonEmptyString(JsonObject o, string key, List<string> problems)
    {
        if (o[key] is not JsonValue value || !value.TryGetValue<string>(out var s) || s.Length == 0)
        {
            problems.Add($"{key} must be a non-empty string");
            return null;
        }
        return s;
    }

    // Unlike TierColor/PlanetType (whose real content JSON already
    // capitalizes each value, e.g. "White"), ComponentCategory's real
    // content values are camelCase ("weapon", "cargoHold") -- the
    // TypeScript union's own literal casing. Case-insensitive parse is
    // what actually matches the real content, not a stricter check for
    // its own sake.
    private static bool TryParseCategory(string raw, out ComponentCategory category) =>
        Enum.TryParse(raw, ignoreCase: true, out category) && Enum.IsDefined(typeof(ComponentCategory), category);

    private static bool HasUnknownKeys(JsonObject o, params string[] allowed)
    {
        var allowedSet = new HashSet<string>(allowed, StringComparer.Ordinal);
        return o.Select(kvp => kvp.Key).Any(key => !allowedSet.Contains(key));
    }
}
