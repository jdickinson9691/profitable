using System.Text.Json;
using System.Text.Json.Nodes;
using Profitable.Core.Schema;

namespace Profitable.Core.Content;

// Ports src/simulation/loadContent.ts. Validation-rule translation, not
// schema-file reuse -- see agent-31-unity-data-schema.md Outputs Section 4
// for why this project avoids a JSON Schema NuGet dependency here. Each
// section's rules below are copied from the corresponding
// src/data/schemas/*.schema.json file, not re-derived from GDD prose.
//
// Data-in, typed-data-out, same as the TypeScript source: this class
// never reads a file itself (see LoadFromFiles for the file-I/O
// convenience wrapper, kept separate from Load()).
public static class ContentLoader
{
    private static readonly string[] SectionNames =
    {
        "resources", "recipes", "refiningRecipes", "schematics", "planets",
    };

    public static LoadedContent Load(JsonNode? rawConfig)
    {
        if (rawConfig is not JsonObject root)
        {
            throw new ContentValidationException(new[]
            {
                "root: expected an object with resources/recipes/refiningRecipes/schematics/planets arrays",
            });
        }

        foreach (var name in SectionNames)
        {
            if (root[name] is not JsonArray)
            {
                throw new ContentValidationException(new[]
                {
                    $"root: missing or non-array '{name}' section",
                });
            }
        }

        var problems = new List<string>();
        var resources = ParseSection(root["resources"]!.AsArray(), "resources", ParseResource, problems);
        var recipes = ParseSection(root["recipes"]!.AsArray(), "recipes", ParseRecipe, problems);
        var refiningRecipes = ParseSection(root["refiningRecipes"]!.AsArray(), "refiningRecipes", ParseRefiningRecipe, problems);
        var schematics = ParseSection(root["schematics"]!.AsArray(), "schematics", ParseSchematic, problems);
        var planets = ParseSection(root["planets"]!.AsArray(), "planets", ParsePlanet, problems);

        if (problems.Count > 0)
        {
            throw new ContentValidationException(problems);
        }

        return new LoadedContent
        {
            Resources = resources,
            Recipes = recipes,
            RefiningRecipes = refiningRecipes,
            Schematics = schematics,
            Planets = planets,
        };
    }

    // File I/O convenience wrapper -- mirrors loadMvpContent.ts's own
    // "read the 5 content/*.json files, merge into one config, hand to
    // the loader" pattern. Load() itself stays file-I/O-free.
    public static LoadedContent LoadFromFiles(
        string resourcesPath,
        string recipesPath,
        string refiningRecipesPath,
        string schematicsPath,
        string planetsPath)
    {
        var merged = new JsonObject
        {
            ["resources"] = ReadJsonNode(resourcesPath),
            ["recipes"] = ReadJsonNode(recipesPath),
            ["refiningRecipes"] = ReadJsonNode(refiningRecipesPath),
            ["schematics"] = ReadJsonNode(schematicsPath),
            ["planets"] = ReadJsonNode(planetsPath),
        };
        return Load(merged);
    }

    private static JsonNode? ReadJsonNode(string path)
    {
        var text = File.ReadAllText(path);
        return JsonNode.Parse(text);
    }

    private static List<T> ParseSection<T>(
        JsonArray array,
        string sectionName,
        Func<JsonObject, string, List<string>, T?> parseItem,
        List<string> problems) where T : class
    {
        var result = new List<T>();
        for (var i = 0; i < array.Count; i++)
        {
            var path = $"{sectionName}[{i}]";
            if (array[i] is not JsonObject itemObject)
            {
                problems.Add($"{path}: expected an object");
                continue;
            }

            var itemProblems = new List<string>();
            var parsed = parseItem(itemObject, path, itemProblems);
            if (itemProblems.Count > 0)
            {
                problems.Add($"{path}: {string.Join("; ", itemProblems)}");
                continue;
            }

            result.Add(parsed!);
        }
        return result;
    }

    // ---- Resource (resource.schema.json) ----

    private static Resource? ParseResource(JsonObject o, string path, List<string> problems)
    {
        var id = RequireNonEmptyString(o, "id", problems);
        var name = RequireNonEmptyString(o, "name", problems);
        var category = RequireNonEmptyString(o, "category", problems);

        Dictionary<Quality, bool>? applicableQualities = null;
        if (o["applicableQualities"] is not JsonObject qualitiesObject)
        {
            problems.Add("missing or invalid 'applicableQualities'");
        }
        else
        {
            applicableQualities = new Dictionary<Quality, bool>();
            foreach (var quality in Qualities.All)
            {
                var key = Qualities.ToJsonName(quality);
                if (qualitiesObject[key] is not JsonValue value || !value.TryGetValue<bool>(out var boolValue))
                {
                    problems.Add($"applicableQualities.{key} must be a boolean");
                    continue;
                }
                applicableQualities[quality] = boolValue;
            }
            if (HasUnknownKeys(qualitiesObject, Qualities.All.Select(Qualities.ToJsonName)))
            {
                problems.Add("applicableQualities has unknown keys");
            }
        }

        int? itemTier = null;
        if (o["itemTier"] is JsonValue itemTierValue)
        {
            if (!itemTierValue.TryGetValue<int>(out var itemTierInt) || itemTierInt < 1 || itemTierInt > 7)
            {
                problems.Add("itemTier must be an integer 1-7");
            }
            else
            {
                itemTier = itemTierInt;
            }
        }

        if (HasUnknownKeys(o, "id", "name", "category", "applicableQualities", "itemTier"))
        {
            problems.Add("unknown top-level field");
        }

        if (problems.Count > 0) return null;

        return new Resource
        {
            Id = id!,
            Name = name!,
            Category = category!,
            ApplicableQualities = applicableQualities!,
            ItemTier = itemTier,
        };
    }

    // ---- Recipe (recipe.schema.json) ----

    private static Recipe? ParseRecipe(JsonObject o, string path, List<string> problems)
    {
        var id = RequireNonEmptyString(o, "id", problems);
        var name = RequireNonEmptyString(o, "name", problems);
        var outputResourceId = RequireNonEmptyString(o, "outputResourceId", problems);
        var outputQuantity = RequirePositiveInt(o, "outputQuantity", problems);

        List<RecipeInput>? inputs = null;
        if (o["inputs"] is not JsonArray inputsArray || inputsArray.Count == 0)
        {
            problems.Add("inputs must be a non-empty array");
        }
        else
        {
            inputs = new List<RecipeInput>();
            for (var i = 0; i < inputsArray.Count; i++)
            {
                if (inputsArray[i] is not JsonObject inputObject)
                {
                    problems.Add($"inputs[{i}] must be an object");
                    continue;
                }

                var category = RequireNonEmptyString(inputObject, "category", problems, $"inputs[{i}].category");
                var quantity = RequirePositiveInt(inputObject, "quantity", problems, $"inputs[{i}].quantity");

                Quality? thresholdQuality = null;
                var hasThresholdQuality = inputObject.ContainsKey("thresholdQuality");
                if (hasThresholdQuality)
                {
                    var raw = inputObject["thresholdQuality"]?.GetValue<string>();
                    if (raw is null || !Qualities.TryParse(raw, out var parsedQuality))
                    {
                        problems.Add($"inputs[{i}].thresholdQuality is not a valid Quality");
                    }
                    else
                    {
                        thresholdQuality = parsedQuality;
                    }
                }

                int? thresholdValue = null;
                var hasThresholdValue = inputObject.ContainsKey("thresholdValue");
                if (hasThresholdValue)
                {
                    if (inputObject["thresholdValue"] is not JsonValue tv || !tv.TryGetValue<int>(out var tvInt) || tvInt < 1 || tvInt > 100)
                    {
                        problems.Add($"inputs[{i}].thresholdValue must be an integer 1-100");
                    }
                    else
                    {
                        thresholdValue = tvInt;
                    }
                }

                // Both present together, or both absent -- the JSON
                // schema's `dependencies` rule, enforced explicitly since
                // C# has no native equivalent (see RecipeInput's own
                // comment).
                if (hasThresholdQuality != hasThresholdValue)
                {
                    problems.Add($"inputs[{i}]: thresholdQuality and thresholdValue must both be present or both absent");
                }

                if (category != null && quantity != null)
                {
                    inputs.Add(new RecipeInput
                    {
                        Category = category,
                        Quantity = quantity.Value,
                        ThresholdQuality = thresholdQuality,
                        ThresholdValue = thresholdValue,
                    });
                }
            }
        }

        if (HasUnknownKeys(o, "id", "name", "inputs", "outputResourceId", "outputQuantity"))
        {
            problems.Add("unknown top-level field");
        }

        if (problems.Count > 0) return null;

        return new Recipe
        {
            Id = id!,
            Name = name!,
            Inputs = inputs!,
            OutputResourceId = outputResourceId!,
            OutputQuantity = outputQuantity!.Value,
        };
    }

    // ---- RefiningRecipe (refiningRecipe.schema.json) ----

    private static RefiningRecipe? ParseRefiningRecipe(JsonObject o, string path, List<string> problems)
    {
        var id = RequireNonEmptyString(o, "id", problems);
        var name = RequireNonEmptyString(o, "name", problems);
        var outputResourceId = RequireNonEmptyString(o, "outputResourceId", problems);
        var outputQuantity = RequirePositiveInt(o, "outputQuantity", problems);

        List<RefiningRecipeInput>? inputs = null;
        if (o["inputs"] is not JsonArray inputsArray || inputsArray.Count == 0)
        {
            problems.Add("inputs must be a non-empty array");
        }
        else
        {
            inputs = new List<RefiningRecipeInput>();
            for (var i = 0; i < inputsArray.Count; i++)
            {
                if (inputsArray[i] is not JsonObject inputObject)
                {
                    problems.Add($"inputs[{i}] must be an object");
                    continue;
                }
                var resourceId = RequireNonEmptyString(inputObject, "resourceId", problems, $"inputs[{i}].resourceId");
                var quantity = RequirePositiveInt(inputObject, "quantity", problems, $"inputs[{i}].quantity");
                if (resourceId != null && quantity != null)
                {
                    inputs.Add(new RefiningRecipeInput { ResourceId = resourceId, Quantity = quantity.Value });
                }
            }
        }

        if (HasUnknownKeys(o, "id", "name", "inputs", "outputResourceId", "outputQuantity"))
        {
            problems.Add("unknown top-level field");
        }

        if (problems.Count > 0) return null;

        return new RefiningRecipe
        {
            Id = id!,
            Name = name!,
            Inputs = inputs!,
            OutputResourceId = outputResourceId!,
            OutputQuantity = outputQuantity!.Value,
        };
    }

    // ---- Schematic (schematic.schema.json) ----

    private static Schematic? ParseSchematic(JsonObject o, string path, List<string> problems)
    {
        var id = RequireNonEmptyString(o, "id", problems);
        var name = RequireNonEmptyString(o, "name", problems);
        var recipeId = RequireNonEmptyString(o, "recipeId", problems);

        TierColor? tier = null;
        var rawTier = o["tier"]?.GetValue<string>();
        if (rawTier is null || !TryParseTierColor(rawTier, out var parsedTier))
        {
            problems.Add("tier is not a valid TierColor");
        }
        else
        {
            tier = parsedTier;
        }

        if (HasUnknownKeys(o, "id", "name", "recipeId", "tier"))
        {
            problems.Add("unknown top-level field");
        }

        if (problems.Count > 0) return null;

        return new Schematic
        {
            Id = id!,
            Name = name!,
            RecipeId = recipeId!,
            Tier = tier!.Value,
        };
    }

    // ---- Planet (planet.schema.json) -- MVP-required fields only ----

    private static Planet? ParsePlanet(JsonObject o, string path, List<string> problems)
    {
        var id = RequireNonEmptyString(o, "id", problems);
        var name = RequireNonEmptyString(o, "name", problems);

        List<string>? producibleResourceIds = null;
        if (o["producibleResourceIds"] is not JsonArray idsArray || idsArray.Count == 0)
        {
            problems.Add("producibleResourceIds must be a non-empty array");
        }
        else
        {
            producibleResourceIds = new List<string>();
            for (var i = 0; i < idsArray.Count; i++)
            {
                if (idsArray[i] is not JsonValue v || !v.TryGetValue<string>(out var s) || s.Length == 0)
                {
                    problems.Add($"producibleResourceIds[{i}] must be a non-empty string");
                    continue;
                }
                producibleResourceIds.Add(s);
            }
        }

        // MVP scope only -- Phase 2+ optional fields (planetType, tier,
        // position, specialtyResourceId, discovered) are not modeled by
        // this agent (see Planet.cs's own scope note), and the real
        // content/planets.json never sets them, so treating them as
        // unknown here doesn't break real-file parsing.
        if (HasUnknownKeys(o, "id", "name", "producibleResourceIds"))
        {
            problems.Add("unknown top-level field (Phase 2+ field, out of Migration Phase 1 scope)");
        }

        if (problems.Count > 0) return null;

        return new Planet
        {
            Id = id!,
            Name = name!,
            ProducibleResourceIds = producibleResourceIds!,
        };
    }

    // ---- shared validation helpers ----

    private static string? RequireNonEmptyString(JsonObject o, string key, List<string> problems, string? label = null)
    {
        label ??= key;
        if (o[key] is not JsonValue value || !value.TryGetValue<string>(out var s) || s.Length == 0)
        {
            problems.Add($"{label} must be a non-empty string");
            return null;
        }
        return s;
    }

    private static int? RequirePositiveInt(JsonObject o, string key, List<string> problems, string? label = null)
    {
        label ??= key;
        if (o[key] is not JsonValue value || !value.TryGetValue<int>(out var i) || i < 1)
        {
            problems.Add($"{label} must be an integer >= 1");
            return null;
        }
        return i;
    }

    private static bool HasUnknownKeys(JsonObject o, params string[] allowed)
    {
        return HasUnknownKeys(o, (IEnumerable<string>)allowed);
    }

    private static bool HasUnknownKeys(JsonObject o, IEnumerable<string> allowed)
    {
        var allowedSet = new HashSet<string>(allowed, StringComparer.Ordinal);
        return o.Select(kvp => kvp.Key).Any(key => !allowedSet.Contains(key));
    }


    private static bool TryParseTierColor(string raw, out TierColor tier) =>
        Enum.TryParse(raw, ignoreCase: false, out tier) && Enum.IsDefined(typeof(TierColor), tier);
}
