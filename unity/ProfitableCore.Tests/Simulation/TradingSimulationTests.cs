using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Direct unit tests for Migration Phase 2 Sub-Phase B's ported logic --
// agent-44-unity-trading-simulation-core.md. Complements
// Parity/TradingParityTests.cs (the stronger, real-content proof); these
// cover the error/rejection paths real content can't reach (e.g. no
// resource in the current catalog exceeds the tier-5 global-listable
// ceiling), mirroring the TypeScript suite's own targeted edge cases
// rather than relying solely on whatever the parity corpus generated.
public class TradingSimulationTests
{
    private static Resource Resource(string id, string category, int? itemTier = null) => new()
    {
        Id = id,
        Name = id,
        Category = category,
        ItemTier = itemTier,
        ApplicableQualities = Qualities.All.ToDictionary(q => q, _ => true),
    };

    private static QualityMap Uniform(int value) =>
        new()
        {
            [Quality.Purity] = value,
            [Quality.Density] = value,
            [Quality.Potency] = value,
            [Quality.Durability] = value,
            [Quality.Rarity] = value,
        };

    [Fact]
    public void CreateListing_ThrowsWhenGlobalTierExceedsTheListableCeiling()
    {
        var resource = Resource("tier-6-item", "crafted", itemTier: 6);
        var instance = new ResourceInstance { Resource = resource, Quantity = 1, Qualities = Uniform(60) };

        Assert.Throws<InvalidOperationException>(() =>
            ListingFactory.CreateListing(instance, 1, 10, GlobalMarketLocation.Instance, "player-1", "listing-1", 0));
    }

    [Fact]
    public void CreateListing_AllowsAPlanetListingAboveTheGlobalCeiling()
    {
        // The tier restriction is global-only -- a planet listing for the
        // same tier-6 item must succeed.
        var resource = Resource("tier-6-item", "crafted", itemTier: 6);
        var instance = new ResourceInstance { Resource = resource, Quantity = 1, Qualities = Uniform(60) };

        var listing = ListingFactory.CreateListing(
            instance, 1, 10, new PlanetMarketLocation { PlanetId = "planet-alpha" }, "player-1", "listing-1", 0);

        Assert.Equal("tier-6-item", listing.ItemId);
    }

    [Fact]
    public void CreateListing_ThrowsWhenEveryQualityDimensionIsNull()
    {
        var resource = Resource("no-quality-item", "solid");
        var instance = new ResourceInstance
        {
            Resource = resource,
            Quantity = 1,
            Qualities = new QualityMap { [Quality.Purity] = null, [Quality.Density] = null, [Quality.Potency] = null, [Quality.Durability] = null, [Quality.Rarity] = null },
        };

        Assert.Throws<InvalidOperationException>(() =>
            ListingFactory.CreateListing(instance, 1, 10, GlobalMarketLocation.Instance, "player-1", "listing-1", 0));
    }

    [Fact]
    public void PurchaseListing_ThrowsWhenAPlanetListingIsMissingItsMarketState()
    {
        var listing = new Listing
        {
            Id = "l1", ItemId = "igneous-ore", Quantity = 5, PricePerUnit = 5, MarketTier = TierColor.White,
            Location = new PlanetMarketLocation { PlanetId = "planet-alpha" }, CreatedByPlayerId = "seller-1", CreatedAt = 0, ExpiresAt = 1000,
        };

        Assert.Throws<InvalidOperationException>(() =>
            PurchaseListingSimulation.PurchaseListing(listing, 1, "buyer-1", null));
    }

    [Fact]
    public void PurchaseListing_ThrowsWhenAGlobalListingIsGivenAMarketState()
    {
        var listing = new Listing
        {
            Id = "l1", ItemId = "igneous-ore", Quantity = 5, PricePerUnit = 5, MarketTier = TierColor.White,
            Location = GlobalMarketLocation.Instance, CreatedByPlayerId = "seller-1", CreatedAt = 0, ExpiresAt = 1000,
        };
        var marketState = new PlanetMarketState { PlanetId = "planet-alpha", ItemId = "igneous-ore", CurrentPrice = 5, BasePrice = 5 };

        Assert.Throws<InvalidOperationException>(() =>
            PurchaseListingSimulation.PurchaseListing(listing, 1, "buyer-1", marketState));
    }

    [Fact]
    public void SellToMarket_ThrowsOnNonPositiveQuantity()
    {
        var marketState = new PlanetMarketState { PlanetId = "planet-alpha", ItemId = "igneous-ore", CurrentPrice = 5, BasePrice = 5 };
        var wallet = new Wallet { PlayerId = "seller-1", Credits = 0 };
        var instance = new ResourceInstance { Resource = Resource("igneous-ore", "solid", 1), Quantity = 1, Qualities = Uniform(60) };

        Assert.Throws<InvalidOperationException>(() =>
            SellToMarketSimulation.SellToMarket(instance, 0, marketState, wallet, "seller-1"));
    }

    [Fact]
    public void SellToGlobalMarket_ThrowsOnNonPositiveQuantity()
    {
        var marketStates = new List<PlanetMarketState> { new() { PlanetId = "planet-alpha", ItemId = "igneous-ore", CurrentPrice = 5, BasePrice = 5 } };
        var wallet = new Wallet { PlayerId = "seller-1", Credits = 0 };
        var instance = new ResourceInstance { Resource = Resource("igneous-ore", "solid", 1), Quantity = 1, Qualities = Uniform(60) };

        Assert.Throws<InvalidOperationException>(() =>
            SellToGlobalMarketSimulation.SellToGlobalMarket(instance, 0, marketStates, wallet, "seller-1"));
    }

    [Fact]
    public void SellToGlobalMarket_ThrowsWhenTierExceedsTheGlobalListableCeiling()
    {
        var marketStates = new List<PlanetMarketState> { new() { PlanetId = "planet-alpha", ItemId = "tier-6-item", CurrentPrice = 5, BasePrice = 5 } };
        var wallet = new Wallet { PlayerId = "seller-1", Credits = 0 };
        var instance = new ResourceInstance { Resource = Resource("tier-6-item", "crafted", 6), Quantity = 1, Qualities = Uniform(60) };

        Assert.Throws<InvalidOperationException>(() =>
            SellToGlobalMarketSimulation.SellToGlobalMarket(instance, 1, marketStates, wallet, "seller-1"));
    }

    [Fact]
    public void GlobalPrice_ThrowsWhenNoPlanetTradesTheItem()
    {
        Assert.Throws<InvalidOperationException>(() =>
            GlobalPrice.GetGlobalPrice("nobody-trades-this", TradeDirection.Buy, new List<PlanetMarketState>()));
    }

    [Fact]
    public void ExpireListings_LeavesUnexpiredListingsUntouched()
    {
        var listings = new List<Listing>
        {
            new() { Id = "l1", ItemId = "igneous-ore", Quantity = 5, PricePerUnit = 5, MarketTier = TierColor.White, Location = GlobalMarketLocation.Instance, CreatedByPlayerId = "seller-1", CreatedAt = 0, ExpiresAt = 2000 },
        };

        var result = ExpireListingsSimulation.ExpireListings(listings, 1000);

        Assert.Empty(result.Expired);
        Assert.Empty(result.Returned);
    }
}
