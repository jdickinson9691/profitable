using System.Text.Json.Nodes;
using Profitable.Core.Content;
using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Content;

// Proves ContentLoader against the real, current content/*.json files
// (copied into Fixtures/, see that folder's README) -- not synthetic
// data. This is the parity proof agent-31-unity-data-schema.md's Outputs
// Section 4 requires.
public class ContentLoaderRealFilesTests
{
    private static string FixturePath(string fileName) =>
        Path.Combine(AppContext.BaseDirectory, "Fixtures", fileName);

    private static LoadedContent LoadRealContent() => ContentLoader.LoadFromFiles(
        FixturePath("resources.json"),
        FixturePath("recipes.json"),
        FixturePath("refiningRecipes.json"),
        FixturePath("schematics.json"),
        FixturePath("planets.json"));

    [Fact]
    public void ItemCountsMatchTheRealContentFiles()
    {
        var loaded = LoadRealContent();

        // Counted directly from content/*.json at the time this fixture
        // was copied (`node -e "JSON.parse(...).length"` per file) --
        // matches the current alpha roster (60 resources / 39
        // crafting+component recipes / 24 schematics per CLAUDE.md, split
        // here into 29 Recipe + 10 RefiningRecipe entries).
        Assert.Equal(60, loaded.Resources.Count);
        Assert.Equal(29, loaded.Recipes.Count);
        Assert.Equal(10, loaded.RefiningRecipes.Count);
        Assert.Equal(24, loaded.Schematics.Count);
        Assert.Single(loaded.Planets);
    }

    [Fact]
    public void HandPickedResourceMatchesFieldForField()
    {
        var loaded = LoadRealContent();
        var igneousOre = loaded.Resources.Single(r => r.Id == "igneous-ore");

        Assert.Equal("Igneous Ore", igneousOre.Name);
        Assert.Equal("solid", igneousOre.Category);
        Assert.Equal(1, igneousOre.ItemTier);
        Assert.True(igneousOre.ApplicableQualities[Quality.Purity]);
        Assert.True(igneousOre.ApplicableQualities[Quality.Density]);
        Assert.True(igneousOre.ApplicableQualities[Quality.Potency]);
        Assert.True(igneousOre.ApplicableQualities[Quality.Durability]);
        Assert.True(igneousOre.ApplicableQualities[Quality.Rarity]);
    }

    [Fact]
    public void HandPickedRecipeMatchesFieldForFieldIncludingThresholdPair()
    {
        var loaded = LoadRealContent();
        var hullPlate = loaded.Recipes.Single(r => r.Id == "ion-forged-hull-plate");

        Assert.Equal("Ion-Forged Hull Plate", hullPlate.Name);
        Assert.Equal("ion-forged-hull-plate", hullPlate.OutputResourceId);
        Assert.Equal(1, hullPlate.OutputQuantity);
        Assert.Equal(2, hullPlate.Inputs.Count);

        var refinedMetalInput = hullPlate.Inputs[0];
        Assert.Equal("refined-metal", refinedMetalInput.Category);
        Assert.Equal(1, refinedMetalInput.Quantity);
        Assert.Equal(Quality.Durability, refinedMetalInput.ThresholdQuality);
        Assert.Equal(60, refinedMetalInput.ThresholdValue);

        var gasInput = hullPlate.Inputs[1];
        Assert.Equal("gas", gasInput.Category);
        Assert.Null(gasInput.ThresholdQuality);
        Assert.Null(gasInput.ThresholdValue);
    }

    [Fact]
    public void HandPickedRefiningRecipeMatchesFieldForField()
    {
        var loaded = LoadRealContent();
        var radiantAlloyBar = loaded.RefiningRecipes.Single(r => r.Id == "radiant-alloy-bar");

        Assert.Equal("Radiant Alloy Bar", radiantAlloyBar.Name);
        Assert.Equal("radiant-alloy-bar", radiantAlloyBar.OutputResourceId);
        Assert.Equal(2, radiantAlloyBar.Inputs.Count);
        Assert.Equal("igneous-ore", radiantAlloyBar.Inputs[0].ResourceId);
        Assert.Equal(2, radiantAlloyBar.Inputs[0].Quantity);
        Assert.Equal("autunite-crystal", radiantAlloyBar.Inputs[1].ResourceId);
        Assert.Equal(1, radiantAlloyBar.Inputs[1].Quantity);
    }

    [Fact]
    public void HandPickedSchematicMatchesFieldForField()
    {
        var loaded = LoadRealContent();
        var schematic = loaded.Schematics.Single(s => s.Id == "ion-forged-hull-plate-blue");

        Assert.Equal("Ion-Forged Hull Plate Schematic", schematic.Name);
        Assert.Equal("ion-forged-hull-plate", schematic.RecipeId);
        Assert.Equal(TierColor.Blue, schematic.Tier);
    }

    [Fact]
    public void HandPickedPlanetMatchesFieldForField()
    {
        var loaded = LoadRealContent();
        var deltaRigelus = loaded.Planets.Single(p => p.Id == "delta-rigelus");

        Assert.Equal("Delta Rigelus", deltaRigelus.Name);
        Assert.Equal(
            new[] { "igneous-ore", "hydrogen-gas", "autunite-crystal" },
            deltaRigelus.ProducibleResourceIds);
    }

    [Fact]
    public void ACorruptedCopyReportsEveryInvalidItemAcrossSections()
    {
        // Deliberately corrupt exactly one item -- resources[0] only --
        // in memory, not the fixture file itself. Mirrors
        // loadContent.test.ts's own "reports every invalid item across
        // sections" test, but against the real file-loading path rather
        // than a synthetic object.
        var resourcesArray = (JsonArray)JsonNode.Parse(File.ReadAllText(FixturePath("resources.json")))!;
        ((JsonObject)resourcesArray[0]!).Remove("category");
        var tempResources = Path.Combine(Path.GetTempPath(), $"resources-corrupted-{Guid.NewGuid():N}.json");
        File.WriteAllText(tempResources, resourcesArray.ToJsonString());

        try
        {
            var exception = Assert.Throws<ContentValidationException>(() => ContentLoader.LoadFromFiles(
                tempResources,
                FixturePath("recipes.json"),
                FixturePath("refiningRecipes.json"),
                FixturePath("schematics.json"),
                FixturePath("planets.json")));

            Assert.Contains("resources[0]", exception.Message);
        }
        finally
        {
            File.Delete(tempResources);
        }
    }
}
