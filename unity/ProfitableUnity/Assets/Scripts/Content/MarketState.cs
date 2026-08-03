#nullable enable
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Profitable.Core.Content;
using Profitable.Core.Schema;
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

        private static Wallet? _wallet;
        private static Dictionary<string, ItemBasePrice>? _basePricesById;
        private static readonly Dictionary<string, PlanetMarketState> MarketStatesByItemId = new();

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
        }
    }
}
