using System;
using System.Linq;
using Profitable.Core.Constants;
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
    // -ownership-presentation.md): the "> Transport N Colonists" /
    // "> Claim Planet" / "> Build Citadel" actions, added to this same
    // panel per that sub-phase's own checklist instruction ("whatever
    // Unity scene covers GatherScene's job"). All three require a ship
    // docked at the starting planet -- resolved here (the first owned
    // ship whose CurrentPlanetId matches), never fabricated, matching the
    // real functions' own docking-required rejection.
    public class GatherPanel
    {
        public GameObject Root { get; }

        private const int ColonistTransportQuantity = 5;

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly PlanetResourceCycle.ResourcesForCycle _currentResources;
        private readonly Text _ownershipStatusText;

        public GatherPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var planet = PlanetOwnershipState.WithOwnership(GalaxyState.StartingPlanet);
            _currentResources = PlanetResourceCycle.GetCurrentPlanetResources(
                planet,
                GameContent.Loaded.Resources,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                isStartingPlanet: true);

            var group = UiFactory.CreateVerticalGroup(parent, "GatherPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Gather", 20);
            var buttonRow = UiFactory.CreateHorizontalGroup(group, "GatherButtons");

            foreach (var resourceId in _currentResources.ProducibleResourceIds)
            {
                var resource = FindResource(resourceId);
                UiFactory.CreateButton(buttonRow, $"Gather {resource.Name}", () => Gather(resourceId));
            }

            UiFactory.CreateText(group, "Planet Ownership:", 14);
            _ownershipStatusText = UiFactory.CreateText(group, "", 12);
            var ownershipButtonRow = UiFactory.CreateHorizontalGroup(group, "OwnershipButtons");
            UiFactory.CreateButton(ownershipButtonRow, $"Transport {ColonistTransportQuantity} Colonists", () => TransportColonists(ColonistTransportQuantity));
            UiFactory.CreateButton(ownershipButtonRow, "Claim Planet", () => ClaimPlanet());
            UiFactory.CreateButton(ownershipButtonRow, "Build Citadel", () => BuildCitadel());

            RefreshOwnership();
        }

        // The public entry point -- exercised directly by EditMode tests
        // (same convention as Agent 35's own version), since Button
        // .onClick invokes this same method. Takes a resource id rather
        // than a Resource: the quality gathered is looked up by id from
        // this panel's already-resolved current-cycle snapshot, never
        // rolled fresh here.
        public ResourceInstance Gather(string resourceId)
        {
            var resource = FindResource(resourceId);
            var qualities = _currentResources.ResourceQualities[resourceId];
            var instance = new ResourceInstance { Resource = resource, Quantity = 1, Qualities = qualities };
            _inventory.Add(instance);

            _log($"Gathered 1x {resource.Name}: {DescribeQualities(qualities)}");
            return instance;
        }

        public void RefreshOwnership()
        {
            var entry = PlanetOwnershipState.GetEntry(GalaxyState.StartingPlanet.Id);
            _ownershipStatusText.text =
                $"Colonists: {entry.ColonistCount} | Citadel level: {entry.CitadelLevel} | Owned by: {entry.OwnedByPlayerId ?? "nobody"}";
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

        public ClaimPlanetResult ClaimPlanet()
        {
            var ship = FindDockedShip();
            if (ship is null)
            {
                var rejected = new ClaimPlanetRejected { Reason = "no owned ship docked at the starting planet" };
                _log($"Claim planet failed: {rejected.Reason}");
                return rejected;
            }

            var planetId = GalaxyState.StartingPlanet.Id;
            var entry = PlanetOwnershipState.GetEntry(planetId);
            var result = PlanetClaimer.ClaimPlanet(ship, GalaxyState.StartingPlanet, PlanetOwnershipState.DefaultPlayerId, entry);

            if (result is ClaimPlanetSucceeded succeeded)
            {
                PlanetOwnershipState.SetEntry(planetId, succeeded.UpdatedOwnershipEntry);
                _log($"Claimed {GalaxyState.StartingPlanet.Name}.");
            }
            else
            {
                _log($"Claim planet failed: {((ClaimPlanetRejected)result).Reason}");
            }

            RefreshOwnership();
            return result;
        }

        public BuildCitadelResult? BuildCitadel()
        {
            var ship = FindDockedShip();
            if (ship is null)
            {
                var rejected = new BuildCitadelRejected { Reason = "no owned ship docked at the starting planet" };
                _log($"Build Citadel failed: {rejected.Reason}");
                return rejected;
            }

            var planetId = GalaxyState.StartingPlanet.Id;
            var entry = PlanetOwnershipState.GetEntry(planetId);
            if (entry.CitadelLevel >= 3)
            {
                _log("Build Citadel failed: already at the maximum level.");
                return null;
            }

            var targetLevel = entry.CitadelLevel + 1;
            var materialResourceId = PlanetOwnershipConstants.CitadelLevelBenefits[targetLevel].ConstructionMaterial?.ResourceId;
            var materialQuantityAvailable = materialResourceId is null ? 0 : _inventory.TotalQuantity(materialResourceId);

            var result = CitadelBuilder.BuildCitadel(ship, GalaxyState.StartingPlanet, targetLevel, MarketState.Wallet, materialQuantityAvailable, entry);

            if (result is BuildCitadelSucceeded succeeded)
            {
                MarketState.SetWallet(succeeded.UpdatedWallet);
                PlanetOwnershipState.SetEntry(planetId, succeeded.UpdatedOwnershipEntry);
                if (succeeded.MaterialResourceId is not null)
                {
                    _inventory.Take(succeeded.MaterialResourceId, succeeded.MaterialQuantityConsumed);
                }
                _log($"Built Citadel to level {targetLevel} on {GalaxyState.StartingPlanet.Name}.");
            }
            else
            {
                _log($"Build Citadel failed: {((BuildCitadelRejected)result).Reason}");
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
