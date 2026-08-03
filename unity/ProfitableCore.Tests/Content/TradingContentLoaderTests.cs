using System.Text.Json.Nodes;
using Profitable.Core.Content;
using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Content;

// Mirrors tests/trading/loadTradingContent.test.ts's own test cases and
// fixture data, same convention as ContentLoaderTests.cs.
public class TradingContentLoaderTests
{
    private static JsonObject ValidConfig() => (JsonObject)JsonNode.Parse("""
    {
      "tradingBasePrices": [
        { "itemId": "igneous-ore", "basePrice": 5 },
        { "itemId": "hydrogen-gas", "basePrice": 4 }
      ],
      "planetMarketPreferences": [
        {
          "planetType": "Terrestrial",
          "sellsCheap": ["igneous-ore"],
          "buysAtPremium": ["hydrogen-gas"]
        }
      ]
    }
    """)!.AsObject();

    [Fact]
    public void LoadsAValidConfig()
    {
        var loaded = TradingContentLoader.Load(ValidConfig());

        Assert.Equal(2, loaded.TradingBasePrices.Count);
        Assert.Equal("igneous-ore", loaded.TradingBasePrices[0].ItemId);
        Assert.Equal(5, loaded.TradingBasePrices[0].BasePrice);

        Assert.Single(loaded.PlanetMarketPreferences);
        Assert.Equal(PlanetType.Terrestrial, loaded.PlanetMarketPreferences[0].PlanetType);
        Assert.Equal(new[] { "igneous-ore" }, loaded.PlanetMarketPreferences[0].SellsCheap);
        Assert.Equal(new[] { "hydrogen-gas" }, loaded.PlanetMarketPreferences[0].BuysAtPremium);
    }

    [Fact]
    public void RejectsMissingTopLevelSections()
    {
        var config = new JsonObject { ["tradingBasePrices"] = new JsonArray() };
        var exception = Assert.Throws<ContentValidationException>(() => TradingContentLoader.Load(config));
        Assert.Contains("planetMarketPreferences", exception.Message);
    }

    [Fact]
    public void RejectsANonPositiveBasePrice()
    {
        var config = ValidConfig();
        ((JsonObject)config["tradingBasePrices"]![0]!)["basePrice"] = 0;
        var exception = Assert.Throws<ContentValidationException>(() => TradingContentLoader.Load(config));
        Assert.Contains("tradingBasePrices[0]", exception.Message);
    }

    [Fact]
    public void RejectsAnInvalidPlanetType()
    {
        var config = ValidConfig();
        ((JsonObject)config["planetMarketPreferences"]![0]!)["planetType"] = "Ocean";
        var exception = Assert.Throws<ContentValidationException>(() => TradingContentLoader.Load(config));
        Assert.Contains("planetMarketPreferences[0]", exception.Message);
    }

    [Fact]
    public void RejectsUnknownTopLevelFields()
    {
        var config = ValidConfig();
        ((JsonObject)config["tradingBasePrices"]![0]!)["unexpected"] = "value";
        var exception = Assert.Throws<ContentValidationException>(() => TradingContentLoader.Load(config));
        Assert.Contains("tradingBasePrices[0]", exception.Message);
    }

    [Fact]
    public void ReportsEveryInvalidItemAcrossSections()
    {
        var config = ValidConfig();
        ((JsonObject)config["tradingBasePrices"]![0]!)["basePrice"] = -1;
        ((JsonObject)config["planetMarketPreferences"]![0]!)["planetType"] = "Ocean";

        var exception = Assert.Throws<ContentValidationException>(() => TradingContentLoader.Load(config));
        Assert.Contains("tradingBasePrices[0]", exception.Message);
        Assert.Contains("planetMarketPreferences[0]", exception.Message);
    }
}
