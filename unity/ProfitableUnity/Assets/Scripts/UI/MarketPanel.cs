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
    // Scoped to the Trading Counterparty instant-sell functions
    // (SellToMarket/SellToGlobalMarket) only -- not the full Listing
    // create/browse/purchase flow, which needs another player's
    // independent action to ever resolve and has no counterpart in this
    // single-player Unity MVP loop yet (same reasoning the TypeScript
    // Trading Counterparty fix itself was built for: a solo player can
    // never buy their own listing). Fixed set of buttons for the 5
    // resources this MVP loop can ever produce (gather/refine/craft),
    // matching Agent 35's own "fixed buttons for a small known set"
    // convention rather than a dynamic per-inventory-item list.
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
            }

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

        private static Resource FindResource(string resourceId) =>
            GameContent.Loaded.Resources.First(r => r.Id == resourceId);
    }
}
