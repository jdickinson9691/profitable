using System.Text.Json.Nodes;
using Profitable.Core.Schema;

namespace Profitable.Core.Content;

// Ports src/trading/loadTradingContent.ts. Validation-rule translation,
// not schema-file reuse -- same reasoning as ContentLoader (this project
// avoids a JSON Schema NuGet dependency; see agent-31-unity-data-schema.md
// Outputs Section 4). Each section's rules below are copied from the
// corresponding src/data/schemas/*.schema.json file, not re-derived from
// GDD prose.
//
// Data-in, typed-data-out, same as the TypeScript source and ContentLoader:
// never reads a file itself (see LoadFromFiles for the file-I/O
// convenience wrapper).
public static class TradingContentLoader
{
    public sealed class LoadedTradingContent
    {
        public List<ItemBasePrice> TradingBasePrices { get; init; } = new();
        public List<PlanetMarketPreference> PlanetMarketPreferences { get; init; } = new();
    }

    public static LoadedTradingContent Load(JsonNode? rawConfig)
    {
        if (rawConfig is not JsonObject root)
        {
            throw new ContentValidationException(new[]
            {
                "root: expected an object with tradingBasePrices/planetMarketPreferences arrays",
            });
        }

        if (root["tradingBasePrices"] is not JsonArray)
        {
            throw new ContentValidationException(new[] { "root: missing or non-array 'tradingBasePrices' section" });
        }
        if (root["planetMarketPreferences"] is not JsonArray)
        {
            throw new ContentValidationException(new[] { "root: missing or non-array 'planetMarketPreferences' section" });
        }

        var problems = new List<string>();
        var basePrices = ParseSection(root["tradingBasePrices"]!.AsArray(), "tradingBasePrices", ParseItemBasePrice, problems);
        var preferences = ParseSection(root["planetMarketPreferences"]!.AsArray(), "planetMarketPreferences", ParsePlanetMarketPreference, problems);

        if (problems.Count > 0)
        {
            throw new ContentValidationException(problems);
        }

        return new LoadedTradingContent { TradingBasePrices = basePrices, PlanetMarketPreferences = preferences };
    }

    // File I/O convenience wrapper -- mirrors ContentLoader.LoadFromFiles's
    // own "read the content JSON files, merge into one config, hand to
    // the loader" pattern. Load() itself stays file-I/O-free.
    public static LoadedTradingContent LoadFromFiles(string tradingBasePricesPath, string planetMarketPreferencesPath)
    {
        var merged = new JsonObject
        {
            ["tradingBasePrices"] = ReadJsonNode(tradingBasePricesPath),
            ["planetMarketPreferences"] = ReadJsonNode(planetMarketPreferencesPath),
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
        Func<JsonObject, List<string>, T?> parseItem,
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
            var parsed = parseItem(itemObject, itemProblems);
            if (itemProblems.Count > 0)
            {
                problems.Add($"{path}: {string.Join("; ", itemProblems)}");
                continue;
            }

            result.Add(parsed!);
        }
        return result;
    }

    // ---- ItemBasePrice (itemBasePrice.schema.json) ----

    private static ItemBasePrice? ParseItemBasePrice(JsonObject o, List<string> problems)
    {
        var itemId = RequireNonEmptyString(o, "itemId", problems);

        double? basePrice = null;
        if (o["basePrice"] is not JsonValue basePriceValue || !basePriceValue.TryGetValue<double>(out var basePriceDouble) || basePriceDouble <= 0)
        {
            problems.Add("basePrice must be a number greater than 0");
        }
        else
        {
            basePrice = basePriceDouble;
        }

        if (HasUnknownKeys(o, "itemId", "basePrice"))
        {
            problems.Add("unknown top-level field");
        }

        if (problems.Count > 0) return null;

        return new ItemBasePrice { ItemId = itemId!, BasePrice = basePrice!.Value };
    }

    // ---- PlanetMarketPreference (planetMarketPreference.schema.json) ----

    private static PlanetMarketPreference? ParsePlanetMarketPreference(JsonObject o, List<string> problems)
    {
        PlanetType? planetType = null;
        var rawPlanetType = o["planetType"]?.GetValue<string>();
        if (rawPlanetType is null || !Enum.TryParse<PlanetType>(rawPlanetType, ignoreCase: false, out var parsedPlanetType) || !Enum.IsDefined(typeof(PlanetType), parsedPlanetType))
        {
            problems.Add("planetType is not a valid PlanetType");
        }
        else
        {
            planetType = parsedPlanetType;
        }

        var sellsCheap = RequireStringArray(o, "sellsCheap", problems);
        var buysAtPremium = RequireStringArray(o, "buysAtPremium", problems);

        if (HasUnknownKeys(o, "planetType", "sellsCheap", "buysAtPremium"))
        {
            problems.Add("unknown top-level field");
        }

        if (problems.Count > 0) return null;

        return new PlanetMarketPreference
        {
            PlanetType = planetType!.Value,
            SellsCheap = sellsCheap!,
            BuysAtPremium = buysAtPremium!,
        };
    }

    // ---- shared validation helpers ----

    private static string? RequireNonEmptyString(JsonObject o, string key, List<string> problems)
    {
        if (o[key] is not JsonValue value || !value.TryGetValue<string>(out var s) || s.Length == 0)
        {
            problems.Add($"{key} must be a non-empty string");
            return null;
        }
        return s;
    }

    private static List<string>? RequireStringArray(JsonObject o, string key, List<string> problems)
    {
        if (o[key] is not JsonArray array)
        {
            problems.Add($"{key} must be an array");
            return null;
        }

        var result = new List<string>();
        for (var i = 0; i < array.Count; i++)
        {
            if (array[i] is not JsonValue v || !v.TryGetValue<string>(out var s) || s.Length == 0)
            {
                problems.Add($"{key}[{i}] must be a non-empty string");
                continue;
            }
            result.Add(s);
        }
        return result;
    }

    private static bool HasUnknownKeys(JsonObject o, params string[] allowed)
    {
        var allowedSet = new HashSet<string>(allowed, StringComparer.Ordinal);
        return o.Select(kvp => kvp.Key).Any(key => !allowedSet.Contains(key));
    }
}
