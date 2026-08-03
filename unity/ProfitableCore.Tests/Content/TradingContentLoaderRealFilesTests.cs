using Profitable.Core.Content;
using Profitable.Core.Schema;

namespace ProfitableCore.Tests.Content;

// Proves TradingContentLoader against the real, current
// content/tradingBasePrices.json and content/planetMarketPreferences.json
// files (copied into Fixtures/, see that folder's README) -- not
// synthetic data, same discipline as ContentLoaderRealFilesTests.
public class TradingContentLoaderRealFilesTests
{
    private static string FixturePath(string fileName) =>
        Path.Combine(AppContext.BaseDirectory, "Fixtures", fileName);

    private static TradingContentLoader.LoadedTradingContent LoadRealContent() =>
        TradingContentLoader.LoadFromFiles(
            FixturePath("tradingBasePrices.json"),
            FixturePath("planetMarketPreferences.json"));

    [Fact]
    public void ItemCountsMatchTheRealContentFiles()
    {
        var loaded = LoadRealContent();

        // Counted directly from content/*.json at the time this fixture
        // was copied.
        Assert.Equal(60, loaded.TradingBasePrices.Count);
        Assert.Equal(4, loaded.PlanetMarketPreferences.Count);
    }

    [Fact]
    public void HandPickedBasePriceMatchesFieldForField()
    {
        var loaded = LoadRealContent();
        var igneousOre = loaded.TradingBasePrices.Single(p => p.ItemId == "igneous-ore");
        Assert.Equal(5, igneousOre.BasePrice);
    }

    [Fact]
    public void HandPickedPreferenceMatchesFieldForField()
    {
        var loaded = LoadRealContent();
        var terrestrial = loaded.PlanetMarketPreferences.Single(p => p.PlanetType == PlanetType.Terrestrial);

        Assert.Contains("igneous-ore", terrestrial.SellsCheap);
        Assert.Contains("hydrogen-gas", terrestrial.BuysAtPremium);
    }

    [Fact]
    public void EveryPlanetTypeHasExactlyOnePreferenceEntry()
    {
        var loaded = LoadRealContent();
        var planetTypes = loaded.PlanetMarketPreferences.Select(p => p.PlanetType).OrderBy(t => t).ToList();
        var expected = new[] { PlanetType.Terrestrial, PlanetType.SuperEarth, PlanetType.Neptunian, PlanetType.GasGiant }.OrderBy(t => t).ToList();
        Assert.Equal(expected, planetTypes);
    }
}
