using System.Text.Json.Nodes;
using Profitable.Core.Content;
using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Content;

// Mirrors tests/simulation/loadContent.test.ts's own test cases and fixture
// data one-for-one, so a reviewer can compare behavior directly against
// the TypeScript suite.
public class ContentLoaderTests
{
    // Same shape and values as loadContent.test.ts's validConfig.
    private static JsonObject ValidConfig() => (JsonObject)JsonNode.Parse("""
    {
      "resources": [
        {
          "id": "igneous-ore",
          "name": "Igneous Ore",
          "category": "solid",
          "applicableQualities": { "purity": true, "density": true, "potency": true, "durability": true, "rarity": true }
        },
        {
          "id": "hydrogen-gas",
          "name": "Hydrogen Gas",
          "category": "gas",
          "applicableQualities": { "purity": true, "density": true, "potency": true, "durability": false, "rarity": true }
        }
      ],
      "recipes": [
        {
          "id": "ion-forged-hull-plate",
          "name": "Ion-Forged Hull Plate",
          "inputs": [
            { "category": "refined-metal", "quantity": 1, "thresholdQuality": "durability", "thresholdValue": 60 },
            { "category": "gas", "quantity": 1 }
          ],
          "outputResourceId": "ion-forged-hull-plate",
          "outputQuantity": 1
        }
      ],
      "refiningRecipes": [
        {
          "id": "radiant-alloy-bar",
          "name": "Radiant Alloy Bar",
          "inputs": [
            { "resourceId": "igneous-ore", "quantity": 2 },
            { "resourceId": "autunite-crystal", "quantity": 1 }
          ],
          "outputResourceId": "radiant-alloy-bar",
          "outputQuantity": 1
        }
      ],
      "schematics": [
        {
          "id": "ion-forged-hull-plate-blue",
          "name": "Ion-Forged Hull Plate Schematic",
          "recipeId": "ion-forged-hull-plate",
          "tier": "Blue"
        }
      ],
      "planets": [
        {
          "id": "delta-rigelus",
          "name": "Delta Rigelus",
          "producibleResourceIds": ["igneous-ore", "hydrogen-gas", "autunite-crystal"]
        }
      ]
    }
    """)!.AsObject();

    [Fact]
    public void ParsesAFullyValidConfigIntoTypedObjects()
    {
        var loaded = ContentLoader.Load(ValidConfig());

        Assert.Equal(2, loaded.Resources.Count);
        Assert.Equal("igneous-ore", loaded.Resources[0].Id);
        Assert.Equal("ion-forged-hull-plate", loaded.Recipes[0].Id);
        Assert.Equal("radiant-alloy-bar", loaded.RefiningRecipes[0].OutputResourceId);
        Assert.Equal(TierColor.Blue, loaded.Schematics[0].Tier);
        Assert.Equal(3, loaded.Planets[0].ProducibleResourceIds.Count);
    }

    [Fact]
    public void AcceptsAConfigWithEverySectionEmpty()
    {
        var empty = new JsonObject
        {
            ["resources"] = new JsonArray(),
            ["recipes"] = new JsonArray(),
            ["refiningRecipes"] = new JsonArray(),
            ["schematics"] = new JsonArray(),
            ["planets"] = new JsonArray(),
        };

        var loaded = ContentLoader.Load(empty);

        Assert.Empty(loaded.Resources);
        Assert.Empty(loaded.Recipes);
        Assert.Empty(loaded.RefiningRecipes);
        Assert.Empty(loaded.Schematics);
        Assert.Empty(loaded.Planets);
    }

    [Fact]
    public void ThrowsNamingTheSectionAndIndexOfAnInvalidItem()
    {
        var invalid = ValidConfig();
        invalid["resources"] = new JsonArray(
            new JsonObject { ["id"] = "igneous-ore", ["name"] = "Igneous Ore", ["category"] = "solid" }); // missing applicableQualities

        var exception = Assert.Throws<ContentValidationException>(() => ContentLoader.Load(invalid));
        Assert.Contains("resources[0]", exception.Message);
    }

    [Fact]
    public void ReportsEveryInvalidItemAcrossSectionsNotJustTheFirst()
    {
        var invalid = ValidConfig();
        invalid["resources"] = new JsonArray(new JsonObject { ["id"] = "x" }); // missing required fields
        invalid["planets"] = new JsonArray(new JsonObject
        {
            ["id"] = "y",
            ["name"] = "Y",
            ["producibleResourceIds"] = new JsonArray(), // empty violates minItems
        });

        var exception = Assert.Throws<ContentValidationException>(() => ContentLoader.Load(invalid));
        Assert.Contains("resources[0]", exception.Message);
        Assert.Contains("planets[0]", exception.Message);
    }

    [Fact]
    public void RejectsARawConfigMissingOneOfTheRequiredArrays()
    {
        var missingPlanets = ValidConfig();
        missingPlanets.Remove("planets");

        Assert.Throws<ContentValidationException>(() => ContentLoader.Load(missingPlanets));
    }

    [Fact]
    public void RejectsANonObjectRawConfig()
    {
        Assert.Throws<ContentValidationException>(() => ContentLoader.Load(JsonValue.Create("not an object")));
        Assert.Throws<ContentValidationException>(() => ContentLoader.Load(null));
    }

    [Fact]
    public void RecipeInputWithOnlyThresholdQualitySetIsRejected()
    {
        var invalid = ValidConfig();
        invalid["recipes"] = new JsonArray(new JsonObject
        {
            ["id"] = "x",
            ["name"] = "X",
            ["inputs"] = new JsonArray(new JsonObject
            {
                ["category"] = "refined-metal",
                ["quantity"] = 1,
                ["thresholdQuality"] = "durability",
                // thresholdValue deliberately omitted
            }),
            ["outputResourceId"] = "x",
            ["outputQuantity"] = 1,
        });

        var exception = Assert.Throws<ContentValidationException>(() => ContentLoader.Load(invalid));
        Assert.Contains("recipes[0]", exception.Message);
    }

    [Fact]
    public void ResourceWithAFalseApplicableQualityStillValidates()
    {
        // "not applicable" is `false`, not a missing key or null -- see
        // agent-31-unity-data-schema.md's testing-requirements note on
        // why this differs from QualityValue's null-vs-zero rule.
        var config = ValidConfig();
        var loaded = ContentLoader.Load(config);
        var hydrogenGas = loaded.Resources.Single(r => r.Id == "hydrogen-gas");
        Assert.False(hydrogenGas.ApplicableQualities[Quality.Durability]);
        Assert.True(hydrogenGas.ApplicableQualities[Quality.Purity]);
    }

    [Fact]
    public void ResourceMissingAQualityKeyIsRejected()
    {
        var invalid = ValidConfig();
        invalid["resources"] = new JsonArray(new JsonObject
        {
            ["id"] = "x",
            ["name"] = "X",
            ["category"] = "solid",
            ["applicableQualities"] = new JsonObject
            {
                ["purity"] = true,
                ["density"] = true,
                ["potency"] = true,
                ["durability"] = true,
                // rarity deliberately omitted
            },
        });

        var exception = Assert.Throws<ContentValidationException>(() => ContentLoader.Load(invalid));
        Assert.Contains("resources[0]", exception.Message);
    }

    [Fact]
    public void ResourceWithItemTierInRangeValidates()
    {
        var config = ValidConfig();
        ((JsonObject)config["resources"]![0]!)["itemTier"] = 3;

        var loaded = ContentLoader.Load(config);
        Assert.Equal(3, loaded.Resources[0].ItemTier);
        Assert.Null(loaded.Resources[1].ItemTier);
    }

    [Fact]
    public void ResourceWithItemTierOutOfRangeIsRejected()
    {
        var invalid = ValidConfig();
        ((JsonObject)invalid["resources"]![0]!)["itemTier"] = 8;

        var exception = Assert.Throws<ContentValidationException>(() => ContentLoader.Load(invalid));
        Assert.Contains("resources[0]", exception.Message);
    }
}
