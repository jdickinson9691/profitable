#nullable enable
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Profitable.Core.Content;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using UnityEngine;

namespace Profitable.Unity.Content
{
    // Migration Phase 2 Sub-Phase B (Trading) Presentation/Integration --
    // docs/agents/agent-46-unity-trading-presentation.md. Parallels
    // GalaxyState.cs's own lazy-static shape: a separate class (not merged
    // into GameContent, which stays scoped to the raw content catalog).
    //
    // Session-only, in-memory, no persistence -- same deliberate scope
    // limit GalaxyState/Inventory already draw. Only the starting planet
    // has a live PlanetMarketState here, since ship travel to any other
    // planet is still Sub-Phase D's scope -- this mirrors GatherPanel's
    // own "only the starting planet is reachable" limit exactly.
    public static class MarketState
    {
        // Session-only Wallet -- no persisted credits, matching Inventory
        // .cs's own "persistence is a later agent's job" scope limit.
        private const double StartingCredits = 100;
        private const string PlayerId = "player-1";

        // Gap closed (2026-08-04): mirrors
        // src/presentation/tradingState.ts's own SEED_MARKET_PLAYER_ID
        // exactly -- a distinct, non-player identity for the two seed
        // listings below, so purchaseListing()'s self-trade check has a
        // real, immediately-buyable counterparty to demonstrate against
        // (a listing the player creates themselves is correctly
        // unbuyable by that same check -- see MarketPanel.Buy()'s own
        // comment for why that's expected, not a bug).
        private const string SeedMarketPlayerId = "seed-market";

        private static Wallet? _wallet;
        private static Dictionary<string, ItemBasePrice>? _basePricesById;
        private static readonly Dictionary<string, PlanetMarketState> MarketStatesByItemId = new();
        private static List<Listing>? _listings;
        private static readonly Dictionary<string, QualityMap> ListingQualitiesById = new();

        public static Wallet Wallet => _wallet ??= new Wallet { PlayerId = PlayerId, Credits = StartingCredits };

        public static void SetWallet(Wallet wallet) => _wallet = wallet;

        private static Dictionary<string, ItemBasePrice> BasePricesById => _basePricesById ??= Load();

        // Lazily creates a planet-market entry the first time an item is
        // priced or sold, seeded from the real content's ItemBasePrice
        // (CurrentPrice starts equal to BasePrice -- an untraded item has
        // never drifted). Returns the same cached instance on every
        // subsequent call so drift from an earlier sale is never lost
        // mid-session.
        public static PlanetMarketState GetOrCreateMarketState(string itemId)
        {
            if (MarketStatesByItemId.TryGetValue(itemId, out var existing)) return existing;

            if (!BasePricesById.TryGetValue(itemId, out var basePrice))
            {
                throw new System.InvalidOperationException($"MarketState: no ItemBasePrice found for '{itemId}'");
            }

            var created = new PlanetMarketState
            {
                PlanetId = GalaxyState.StartingPlanet.Id,
                ItemId = itemId,
                BasePrice = basePrice.BasePrice,
                CurrentPrice = basePrice.BasePrice,
            };
            MarketStatesByItemId[itemId] = created;
            return created;
        }

        public static void SetMarketState(string itemId, PlanetMarketState updated) => MarketStatesByItemId[itemId] = updated;

        // The only planet currently reachable, so it's also the only
        // planet "trading" any item from GetGlobalPrice()'s point of view
        // -- a real, if degenerate (single-planet), use of the same
        // function Sub-Phase D's later multi-planet travel will exercise
        // more fully.
        public static IReadOnlyList<PlanetMarketState> AllKnownMarketStatesFor(string itemId) =>
            MarketStatesByItemId.TryGetValue(itemId, out var state) ? new[] { state } : System.Array.Empty<PlanetMarketState>();

        // Session-only, same as everything else in this class -- lazily
        // seeded on first access, mirroring
        // tradingState.ts's own loadOrCreateListings()/createSeedListings()
        // (minus the ISaveSystem persistence layer that function also has,
        // out of scope here for the same reason Wallet/PlanetMarketState
        // above are session-only too).
        public static List<Listing> Listings => _listings ??= CreateSeedListings();

        public static void AddListing(Listing listing) => Listings.Add(listing);

        public static void ReplaceListing(Listing updated)
        {
            var index = Listings.FindIndex(l => l.Id == updated.Id);
            if (index >= 0) Listings[index] = updated;
        }

        public static QualityMap GetListingQualities(string listingId) =>
            ListingQualitiesById.TryGetValue(listingId, out var qualities) ? qualities : new QualityMap();

        public static void SetListingQualities(string listingId, QualityMap qualities) => ListingQualitiesById[listingId] = qualities;

        // Mirrors createSeedListings() exactly: one planet listing (20x
        // Igneous Ore @ 6cr, at the starting planet) and one global
        // listing (5x Radiant Alloy Bar @ 38cr), both owned by
        // SeedMarketPlayerId so they're immediately buyable by the real
        // player -- the only non-player-created counterparty this
        // single-player MVP has, same real, already-documented limit the
        // TypeScript source has (docs/functional-agents/planetary-markets.md's
        // own flagged gap: once these sell out, no new one exists until
        // the player lists something of their own, which they can then
        // never buy back).
        private static List<Listing> CreateSeedListings()
        {
            var now = System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var sampleQualities = new QualityMap
            {
                [Quality.Purity] = 55, [Quality.Density] = 55, [Quality.Potency] = 55, [Quality.Durability] = 55, [Quality.Rarity] = 55,
            };
            var listings = new List<Listing>();

            var igneousOre = GameContent.Loaded.Resources.FirstOrDefault(r => r.Id == "igneous-ore");
            if (igneousOre is not null)
            {
                var listing = ListingFactory.CreateListing(
                    new ResourceInstance { Resource = igneousOre, Quantity = 20, Qualities = sampleQualities },
                    20, 6, new PlanetMarketLocation { PlanetId = GalaxyState.StartingPlanet.Id },
                    SeedMarketPlayerId, "seed-listing-igneous-ore", now);
                listings.Add(listing);
                ListingQualitiesById[listing.Id] = sampleQualities;
            }

            var radiantAlloyBar = GameContent.Loaded.Resources.FirstOrDefault(r => r.Id == "radiant-alloy-bar");
            if (radiantAlloyBar is not null)
            {
                var listing = ListingFactory.CreateListing(
                    new ResourceInstance { Resource = radiantAlloyBar, Quantity = 5, Qualities = sampleQualities },
                    5, 38, GlobalMarketLocation.Instance,
                    SeedMarketPlayerId, "seed-listing-radiant-alloy-bar", now);
                listings.Add(listing);
                ListingQualitiesById[listing.Id] = sampleQualities;
            }

            return listings;
        }

        private static Dictionary<string, ItemBasePrice> Load()
        {
            var contentDir = Path.Combine(Application.streamingAssetsPath, "Content");
            var loaded = TradingContentLoader.LoadFromFiles(
                Path.Combine(contentDir, "tradingBasePrices.json"),
                Path.Combine(contentDir, "planetMarketPreferences.json"));
            return loaded.TradingBasePrices.ToDictionary(p => p.ItemId, p => p);
        }

        // Mirrors GameContent/GalaxyState's own ResetForTests() hook.
        public static void ResetForTests()
        {
            _wallet = null;
            _basePricesById = null;
            MarketStatesByItemId.Clear();
            _listings = null;
            ListingQualitiesById.Clear();
        }
    }
}
