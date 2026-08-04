#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Migration Phase 2 Sub-Phase B (Trading) Presentation --
    // docs/agents/agent-46-unity-trading-presentation.md.
    //
    // Originally scoped to the Trading Counterparty instant-sell
    // functions (SellToMarket/SellToGlobalMarket) only. Fixed set of
    // buttons for the 5 resources this MVP loop can ever produce
    // (gather/refine/craft), matching Agent 35's own "fixed buttons for
    // a small known set" convention rather than a dynamic
    // per-inventory-item list.
    //
    // Gap closed (2026-08-04): the full Listing create/browse/purchase
    // flow was entirely absent -- now mirrors
    // src/presentation/scenes/MarketScene.ts's real "> List" / "> Buy 1"
    // / "> Buy All" actions exactly, including its own
    // MarketState.SeedMarketPlayerId seed listings (see that class's own
    // comment) as the one real, immediately-buyable counterparty this
    // single-player MVP has. purchaseListing()'s self-trade check is
    // never bypassed or hidden here: a listing the player creates via
    // "List" is shown in the same Active Listings list as the seed ones,
    // with the same "Buy" buttons -- clicking Buy on your own listing
    // correctly gets rejected by the real Core function, proving the
    // rule is enforced rather than just not exercised. This is the same
    // already-documented, real gap the seed listings exist to work
    // around in the first place (docs/functional-agents
    // /planetary-markets.md): once they sell out, no new non-player
    // counterparty exists until the player lists something themselves,
    // which they can then never buy back -- not fixed here, faithfully
    // reproduced, since fixing it would be new scope, not a presentation
    // wiring gap.
    public class MarketPanel
    {
        public GameObject Root { get; }

        private static readonly string[] SellableResourceIds =
        {
            "igneous-ore", "hydrogen-gas", "autunite-crystal", "radiant-alloy-bar", "ion-forged-hull-plate",
        };

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly Text _statusText;
        private readonly RectTransform _listingsGroup;

        public MarketPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "MarketPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Market", 20);
            _statusText = UiFactory.CreateText(group, "", 13);

            foreach (var resourceId in SellableResourceIds)
            {
                var resource = FindResource(resourceId);
                var row = UiFactory.CreateHorizontalGroup(group, $"MarketRow_{resourceId}");
                UiFactory.CreateButton(row, $"Sell {resource.Name} (Planet)", () => SellToPlanet(resourceId));
                UiFactory.CreateButton(row, $"Sell {resource.Name} (Global)", () => SellToGlobal(resourceId));
                UiFactory.CreateButton(row, $"List {resource.Name}", () => ListForSale(resourceId));
            }

            UiFactory.CreateText(group, "Active listings:", 14);
            _listingsGroup = UiFactory.CreateVerticalGroup(group, "Listings");

            Refresh();
        }

        public void Refresh()
        {
            var lines = new List<string> { $"Wallet: {MarketState.Wallet.Credits:F2} credits" };
            foreach (var resourceId in SellableResourceIds)
            {
                var resource = FindResource(resourceId);
                var marketState = MarketState.GetOrCreateMarketState(resourceId);
                lines.Add($"{resource.Name}: {_inventory.TotalQuantity(resourceId)} held, planet price {marketState.CurrentPrice:F2}");
            }
            _statusText.text = string.Join("\n", lines);

            UiFactory.ClearChildren(_listingsGroup);
            foreach (var listing in MarketState.Listings.Where(l => l.Quantity > 0))
            {
                var resource = FindResource(listing.ItemId);
                var locationLabel = listing.Location.IsGlobal ? "global" : "planet";
                var row = UiFactory.CreateHorizontalGroup(_listingsGroup, $"Listing_{listing.Id}");
                UiFactory.CreateText(row,
                    $"{resource.Name} x{listing.Quantity} @ {listing.PricePerUnit:F2}cr ({listing.MarketTier}, {locationLabel}) -- seller: {listing.CreatedByPlayerId}", 12);
                UiFactory.CreateButton(row, $"Buy 1 {listing.Id}", () => Buy(listing.Id, 1));
                if (listing.Quantity > 1)
                {
                    UiFactory.CreateButton(row, $"Buy All {listing.Id}", () => Buy(listing.Id, listing.Quantity));
                }
            }
        }

        // Public entry points -- exercised directly by EditMode tests,
        // same convention as every other panel's trigger method, since
        // Button.onClick invokes these same methods.
        public SellToMarketResult? SellToPlanet(string resourceId)
        {
            if (_inventory.TotalQuantity(resourceId) < 1)
            {
                _log($"Sell failed: no {FindResource(resourceId).Name} to sell.");
                return null;
            }

            var taken = _inventory.Take(resourceId, 1)[0];
            var marketState = MarketState.GetOrCreateMarketState(resourceId);
            var result = SellToMarketSimulation.SellToMarket(taken, 1, marketState, MarketState.Wallet, MarketState.Wallet.PlayerId);

            MarketState.SetMarketState(resourceId, result.UpdatedMarketState);
            MarketState.SetWallet(result.UpdatedWallet);

            _log($"Sold 1x {FindResource(resourceId).Name} to the planet market for {result.ProceedsToSeller:F2} credits (fee {result.FeeDeducted:F2}).");
            Refresh();
            return result;
        }

        public SellToGlobalMarketResult? SellToGlobal(string resourceId)
        {
            if (_inventory.TotalQuantity(resourceId) < 1)
            {
                _log($"Sell failed: no {FindResource(resourceId).Name} to sell.");
                return null;
            }

            var taken = _inventory.Take(resourceId, 1)[0];
            // GetGlobalPrice requires at least one PlanetMarketState to
            // exist for this item -- ensures the starting planet's own
            // entry exists before reading the derived global price.
            MarketState.GetOrCreateMarketState(resourceId);
            var marketStates = MarketState.AllKnownMarketStatesFor(resourceId);
            var result = SellToGlobalMarketSimulation.SellToGlobalMarket(taken, 1, marketStates, MarketState.Wallet, MarketState.Wallet.PlayerId);

            MarketState.SetWallet(result.UpdatedWallet);

            _log($"Sold 1x {FindResource(resourceId).Name} to the global market for {result.ProceedsToSeller:F2} credits (fee {result.FeeDeducted:F2}).");
            Refresh();
            return result;
        }

        // Creates a real Listing for everything currently held of
        // resourceId, priced at the current planet market price (rounded
        // -- mirrors MarketScene.ts's own `suggestedPrice`), owned by the
        // real player id. Ports MarketScene.sell() -- distinct from
        // SellToPlanet/SellToGlobal's instant Trading Counterparty sale,
        // this is the "list and wait for a buyer" path.
        public Listing? ListForSale(string resourceId)
        {
            var quantity = _inventory.TotalQuantity(resourceId);
            if (quantity < 1)
            {
                _log($"List failed: no {FindResource(resourceId).Name} to list.");
                return null;
            }

            var taken = _inventory.Take(resourceId, quantity);
            var marketState = MarketState.GetOrCreateMarketState(resourceId);
            var pricePerUnit = Math.Round(marketState.CurrentPrice);
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            var listing = ListingFactory.CreateListing(
                taken[0], quantity, pricePerUnit,
                new PlanetMarketLocation { PlanetId = GalaxyState.StartingPlanet.Id },
                MarketState.Wallet.PlayerId, $"listing-{now}-{resourceId}", now);

            MarketState.AddListing(listing);
            MarketState.SetListingQualities(listing.Id, taken[0].Qualities);

            _log($"Listed {quantity}x {FindResource(resourceId).Name} @ {pricePerUnit:F2}cr/unit.");
            Refresh();
            return listing;
        }

        // Ports MarketScene.buy() -- real purchaseListing() call, real
        // self-trade rejection when listing.CreatedByPlayerId matches
        // the real player id (never special-cased away here).
        public PurchaseResult? Buy(string listingId, int quantity)
        {
            var listing = MarketState.Listings.FirstOrDefault(l => l.Id == listingId);
            if (listing is null)
            {
                _log("Purchase failed: no such listing.");
                return null;
            }

            var marketState = listing.Location.IsGlobal ? null : MarketState.GetOrCreateMarketState(listing.ItemId);
            var result = PurchaseListingSimulation.PurchaseListing(listing, quantity, MarketState.Wallet.PlayerId, marketState);

            if (result is PurchaseRejected rejected)
            {
                _log($"Purchase failed: {rejected.Reason}");
                return result;
            }

            var succeeded = (PurchaseSucceeded)result;
            MarketState.SetWallet(new Wallet { PlayerId = MarketState.Wallet.PlayerId, Credits = MarketState.Wallet.Credits - succeeded.TotalPaid });
            MarketState.ReplaceListing(succeeded.UpdatedListing);
            if (succeeded.UpdatedMarketState is not null)
            {
                MarketState.SetMarketState(listing.ItemId, succeeded.UpdatedMarketState);
            }

            var resource = FindResource(listing.ItemId);
            var qualities = MarketState.GetListingQualities(listingId);
            _inventory.Add(new ResourceInstance { Resource = resource, Quantity = succeeded.QuantityPurchased, Qualities = qualities });

            _log($"Bought {succeeded.QuantityPurchased}x {resource.Name} for {succeeded.TotalPaid:F2} credits (fee {succeeded.FeeDeducted:F2}).");
            Refresh();
            return result;
        }

        private static Resource FindResource(string resourceId) =>
            GameContent.Loaded.Resources.First(r => r.Id == resourceId);
    }
}
