using System;
using System.Linq;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Migration Phase 2 Sub-Phase A rewrite (Presentation/Integration --
    // agent-41-unity-galaxy-planet-presentation.md), replacing Agent 35's
    // three-fixed-button/fresh-roll-per-click MVP version. Matches
    // mining.md's real, already-shipped TypeScript behavior change (src
    // /presentation/scenes/GatherScene.ts): quality rolling moved to
    // planet generation/reset-cycle time (PlanetResourceCycle), so this
    // panel reads GetCurrentPlanetResources() ONCE per visit (construction
    // time) and every click adds that already-fixed quality -- it never
    // rolls anything itself.
    //
    // Ship travel/current-planet tracking is Sub-Phase D's scope, not yet
    // ported -- this always reads GalaxyState.StartingPlanet, same as
    // GatherScene.ts would if getCurrentPlanet() didn't exist yet.
    //
    // Migration Phase 2 Sub-Phase E addition (agent-61-unity-planet
    // -ownership-presentation.md): the "> Transport N Colonists" action,
    // added to this same panel per that sub-phase's own checklist
    // instruction ("whatever Unity scene covers GatherScene's job").
    // Requires a ship docked at the starting planet -- resolved here (the
    // first owned ship whose CurrentPlanetId matches), never fabricated,
    // matching the real function's own docking-required rejection.
    //
    // Retroactive removal (2026-08-04): this panel used to also render
    // "> Claim Planet" / "> Build Citadel" actions -- both removed along
    // with the whole Citadels sub-system, see planet-ownership.md's own
    // retroactive note. Colonist-Driven Production (Transport Colonists)
    // never depended on either, so nothing else here changes.
    public class GatherPanel
    {
        public GameObject Root { get; }

        // Test-only accessor -- exposes the panel's already-resolved
        // current-cycle snapshot (including Per-Resource Quantity Caps) so
        // EditMode tests can discover a real capped resource id without
        // hardcoding one, since which ids the real starting planet produces
        // (and at what tier, and therefore what cap) depends on the real
        // galaxy seed, not something a test should assume.
        public PlanetResourceCycle.ResourcesForCycle CurrentResources => _currentResources;

        private const int ColonistTransportQuantity = 5;

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly Planet _planet;
        private readonly PlanetResourceCycle.ResourcesForCycle _currentResources;
        private readonly int _cycleIndex;
        private readonly RectTransform _buttonRow;
        private readonly Text _ownershipStatusText;

        public GatherPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            _planet = PlanetOwnershipState.WithOwnership(GalaxyState.StartingPlanet);
            var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _currentResources = PlanetResourceCycle.GetCurrentPlanetResources(
                _planet,
                GameContent.Loaded.Resources,
                nowMs,
                isStartingPlanet: true);
            // Same (planetId, now) pair GetCurrentPlanetResources() itself
            // derived its cycle from -- computed again here (cheap, pure,
            // no persisted state either) so depletion lookups below key off
            // the identical cycle.
            _cycleIndex = PlanetResourceCycle.GetCycleIndex(_planet.Id, nowMs);

            var group = UiFactory.CreateVerticalGroup(parent, "GatherPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Gather", 20);
            _buttonRow = UiFactory.CreateHorizontalGroup(group, "GatherButtons");
            RefreshGatherButtons();

            UiFactory.CreateText(group, "Planet Ownership:", 14);
            _ownershipStatusText = UiFactory.CreateText(group, "", 12);
            var ownershipButtonRow = UiFactory.CreateHorizontalGroup(group, "OwnershipButtons");
            UiFactory.CreateButton(ownershipButtonRow, $"Transport {ColonistTransportQuantity} Colonists", () => TransportColonists(ColonistTransportQuantity));

            RefreshOwnership();
        }

        // Per-Resource Quantity Caps: rebuilds the gather-button row from
        // scratch (ClearChildren + rebuild, the same convention ShipsPanel
        // .Refresh() already uses for its own runtime-changing rows) --
        // called once at construction and again after every Gather() call,
        // so a resource that just hit zero remaining renders as a plain
        // "depleted until reset" label instead of a clickable button, never
        // a button that silently no-ops on click.
        private void RefreshGatherButtons()
        {
            UiFactory.ClearChildren(_buttonRow);
            foreach (var resourceId in _currentResources.ProducibleResourceIds)
            {
                var resource = FindResource(resourceId);
                var cap = _currentResources.ResourceQuantityCaps.TryGetValue(resourceId, out var c) ? c : null;
                var entry = ResourceDepletionState.GetEntry(_planet.Id, resourceId);
                var remaining = ResourceDepletion.GetRemainingQuantity(cap, entry, _cycleIndex);

                if (remaining == 0)
                {
                    UiFactory.CreateText(_buttonRow, $"{resource.Name}: depleted until reset", 13);
                }
                else
                {
                    UiFactory.CreateButton(_buttonRow, $"Gather {resource.Name}", () => Gather(resourceId));
                }
            }
        }

        // The public entry point -- exercised directly by EditMode tests
        // (same convention as Agent 35's own version), since Button
        // .onClick invokes this same method. Takes a resource id rather
        // than a Resource: the quality gathered is looked up by id from
        // this panel's already-resolved current-cycle snapshot, never
        // rolled fresh here.
        public ResourceInstance? Gather(string resourceId)
        {
            var cap = _currentResources.ResourceQuantityCaps.TryGetValue(resourceId, out var c) ? c : null;
            var entryBefore = ResourceDepletionState.GetEntry(_planet.Id, resourceId);
            var remainingBefore = ResourceDepletion.GetRemainingQuantity(cap, entryBefore, _cycleIndex);
            // Defensive guard only -- unreachable in normal play, since a
            // depleted resource's row is never rendered as a clickable
            // button in the first place (RefreshGatherButtons() above).
            if (remainingBefore == 0)
            {
                _log($"Gather failed: {FindResource(resourceId).Name} is depleted until reset.");
                return null;
            }

            var resource = FindResource(resourceId);
            var qualities = _currentResources.ResourceQualities[resourceId];
            var instance = new ResourceInstance { Resource = resource, Quantity = 1, Qualities = qualities };
            _inventory.Add(instance);

            // Uncapped resources (cap == null) never need a depletion entry --
            // nothing to track against, so skip persisting one at all.
            if (cap is not null)
            {
                ResourceDepletionState.RecordGather(_planet.Id, resourceId, _cycleIndex, 1);
                RefreshGatherButtons();
            }

            _log($"Gathered 1x {resource.Name}: {DescribeQualities(qualities)}");
            return instance;
        }

        public void RefreshOwnership()
        {
            var entry = PlanetOwnershipState.GetEntry(GalaxyState.StartingPlanet.Id);
            _ownershipStatusText.text = $"Colonists: {entry.ColonistCount}";
        }

        private static Ship? FindDockedShip() =>
            ShipsState.OwnedShips.FirstOrDefault(s => s.CurrentPlanetId == GalaxyState.StartingPlanet.Id);

        // Public entry points -- exercised directly by EditMode tests,
        // same convention as every other panel's trigger methods.
        public TransportColonistsResult TransportColonists(int quantity)
        {
            var ship = FindDockedShip();
            if (ship is null)
            {
                var rejected = new TransportColonistsRejected { Reason = "no owned ship docked at the starting planet" };
                _log($"Transport colonists failed: {rejected.Reason}");
                return rejected;
            }

            var planetId = GalaxyState.StartingPlanet.Id;
            var entry = PlanetOwnershipState.GetEntry(planetId);
            var result = ColonistTransporter.TransportColonists(ship, GalaxyState.StartingPlanet, quantity, MarketState.Wallet, entry);

            if (result is TransportColonistsSucceeded succeeded)
            {
                MarketState.SetWallet(succeeded.UpdatedWallet);
                PlanetOwnershipState.SetEntry(planetId, succeeded.UpdatedOwnershipEntry);
                _log($"Transported {quantity} colonists to {GalaxyState.StartingPlanet.Name} (now {succeeded.UpdatedOwnershipEntry.ColonistCount}).");
            }
            else
            {
                _log($"Transport colonists failed: {((TransportColonistsRejected)result).Reason}");
            }

            RefreshOwnership();
            return result;
        }

        private static Resource FindResource(string resourceId) =>
            GameContent.Loaded.Resources.First(r => r.Id == resourceId);

        public static string DescribeQualities(QualityMap qualities)
        {
            var parts = Qualities.All
                .Where(q => qualities.TryGetValue(q, out var v) && v is not null)
                .Select(q => $"{Qualities.ToJsonName(q)}={qualities[q]} ({TierColorResolver.GetTierColor(qualities[q]!.Value)})");
            return string.Join(", ", parts);
        }
    }
}
