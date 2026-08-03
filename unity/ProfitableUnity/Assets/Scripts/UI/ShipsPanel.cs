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
    // Migration Phase 2 Sub-Phase D (Ships & Travel) Presentation --
    // docs/agents/agent-56-unity-ships-travel-presentation.md.
    //
    // Scoped to purchase -> refuel -> check-repair -> travel -> resolve
    // -arrival, the real core loop `ship.md`/`travel.md` describe, using
    // GalaxyState's two reachable planets (starting + secondary
    // destination). Deliberately does NOT include ship-crew-role
    // assignment UI (Pilot/Combat Engineer/etc. -- CrewPanel already
    // covers hiring/upkeep/dismiss without touching ship roles) or
    // scanner purchase/scan UI -- both real, separate presentation
    // surfaces of their own scope this panel doesn't claim.
    //
    // Migration Phase 2 Sub-Phase F addition (agent-63-unity-encounters
    // -combat-presentation.md): ResolveArrival now opts into real
    // encounter/combat resolution (passing destinationPlanet/resources),
    // applies TradeOpportunity/Discovery/Hazard outcomes to
    // Wallet/Inventory (ResolveEncounters' own contract: it only reports
    // what happened, applying it is the caller's job), and surfaces any
    // detected pending combat as an Attack/Flee choice. A won combat
    // leaves the ship exactly where it is -- this MVP has no "return
    // voyage" UI for a normal win, only the automatic retreat voyage a
    // flee/loss produces; a full bidirectional travel system is out of
    // scope for what this integration needs to prove.
    public class ShipsPanel
    {
        public GameObject Root { get; }

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly RandomFn _random;
        private readonly Text _statusText;
        private readonly RectTransform _shipyardGroup;
        private readonly RectTransform _shipsGroup;
        private readonly RectTransform _pendingCombatsGroup;

        private static readonly System.Random SharedRandom = new();
        private static double DefaultRandom() => SharedRandom.NextDouble();

        // `random` is an injection seam, not a real gameplay knob -- real
        // play always gets the default `System.Random`-backed roll;
        // EditMode tests pass a fixed sequence so encounter/combat
        // outcomes (otherwise genuinely random) are actually assertable,
        // same reasoning PlanetOwnershipState's SetSaveSystem seam
        // already established for FileSaveSystem.
        public ShipsPanel(Transform parent, Inventory inventory, Action<string> log, RandomFn? random = null)
        {
            _inventory = inventory;
            _log = log;
            _random = random ?? DefaultRandom;

            var group = UiFactory.CreateVerticalGroup(parent, "ShipsPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Ships", 20);
            _statusText = UiFactory.CreateText(group, "", 13);

            UiFactory.CreateText(group, "Shipyard:", 14);
            _shipyardGroup = UiFactory.CreateVerticalGroup(group, "Shipyard");

            UiFactory.CreateText(group, "Owned ships:", 14);
            _shipsGroup = UiFactory.CreateVerticalGroup(group, "OwnedShips");

            UiFactory.CreateText(group, "Pending combat:", 14);
            _pendingCombatsGroup = UiFactory.CreateVerticalGroup(group, "PendingCombats");

            Refresh();
        }

        private static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        // The only two planets this MVP's travel loop ever moves between
        // -- resolves whichever one a Voyage's own DestinationPlanetId
        // names, so ResolveArrival works correctly for both the outbound
        // leg and an automatic retreat voyage's return leg.
        private static Planet ResolveKnownPlanet(string planetId) =>
            planetId == GalaxyState.StartingPlanet.Id
                ? PlanetOwnershipState.WithOwnership(GalaxyState.StartingPlanet)
                : GalaxyState.SecondaryDestinationPlanet;

        public void Refresh()
        {
            var voyage = ShipsState.ActiveVoyage;
            var voyageStatus = voyage is null
                ? "no active voyage"
                : $"voyage to {(voyage.DestinationPlanetId == GalaxyState.SecondaryDestinationPlanet.Id ? GalaxyState.SecondaryDestinationPlanet.Name : voyage.DestinationPlanetId)}, arrives at {voyage.ArrivesAt:F0}ms (now {NowMs()}ms)";
            _statusText.text = $"Wallet: {MarketState.Wallet.Credits:F2} credits | {voyageStatus}";

            UiFactory.ClearChildren(_shipyardGroup);
            var pool = ShipsState.GetOrRefreshShipyardPool(NowMs());
            foreach (var candidate in pool.AvailableShips)
            {
                var row = UiFactory.CreateHorizontalGroup(_shipyardGroup, $"ShipCandidate_{candidate.Id}");
                UiFactory.CreateText(row, $"{candidate.Name} ({candidate.Tier})", 12);
                UiFactory.CreateButton(row, $"Purchase {candidate.Id}", () => PurchaseShip(candidate.Id));
            }

            UiFactory.ClearChildren(_shipsGroup);
            foreach (var ship in ShipsState.OwnedShips)
            {
                var row = UiFactory.CreateHorizontalGroup(_shipsGroup, $"Ship_{ship.Id}");
                UiFactory.CreateText(row, $"{ship.Name} ({ship.Tier}) fuel {ship.CurrentFuel:F1}/{ship.FuelCapacity:F1} @ {ship.CurrentPlanetId}", 12);
                UiFactory.CreateButton(row, $"Refuel {ship.Id}", () => RefuelShip(ship.Id, 10));
                UiFactory.CreateButton(row, $"Check Repair {ship.Id}", () => CheckRepair(ship.Id));
                if (ShipsState.ActiveVoyage is null)
                {
                    UiFactory.CreateButton(row, $"Travel {ship.Id}", () => InitiateVoyageToSecondaryDestination(ship.Id));
                }
                else if (ShipsState.ActiveVoyage.ShipId == ship.Id)
                {
                    UiFactory.CreateButton(row, $"Resolve Arrival {ship.Id}", () => ResolveArrival(ship.Id));
                }
            }

            UiFactory.ClearChildren(_pendingCombatsGroup);
            foreach (var pending in ShipsState.PendingCombats)
            {
                var row = UiFactory.CreateHorizontalGroup(_pendingCombatsGroup, $"PendingCombat_{pending.Encounter.Id}");
                UiFactory.CreateText(row, $"{pending.ShipId}: opponent tier {pending.Encounter.OpponentThreatTier}", 12);
                UiFactory.CreateButton(row, $"Attack {pending.Encounter.Id}", () => ResolveCombat(pending.Encounter.Id, "attack"));
                UiFactory.CreateButton(row, $"Flee {pending.Encounter.Id}", () => ResolveCombat(pending.Encounter.Id, "flee"));
            }
        }

        // Public entry points -- exercised directly by EditMode tests,
        // same convention as every other panel's trigger methods.
        public PurchaseShipResult PurchaseShip(string candidateId)
        {
            var pool = ShipsState.GetOrRefreshShipyardPool(NowMs());
            var candidate = pool.AvailableShips.FirstOrDefault(c => c.Id == candidateId);
            if (candidate is null)
            {
                var rejected = new PurchaseShipRejected { Reason = $"'{candidateId}' is not in this planet's shipyard pool" };
                _log($"Purchase failed: {rejected.Reason}");
                return rejected;
            }

            var result = ShipPurchaser.PurchaseShip(candidate, pool, MarketState.Wallet, MarketState.Wallet.PlayerId);
            if (result is PurchaseShipSucceeded succeeded)
            {
                ShipsState.OwnedShips.Add(succeeded.Ship);
                ShipsState.SetShipyardPool(succeeded.UpdatedPool);
                MarketState.SetWallet(succeeded.UpdatedWallet);
                _log($"Purchased {succeeded.Ship.Name} ({succeeded.Ship.Tier}).");
            }
            else
            {
                _log($"Purchase failed: {((PurchaseShipRejected)result).Reason}");
            }

            Refresh();
            return result;
        }

        public RefuelShipResult RefuelShip(string shipId, double amount)
        {
            var ship = ShipsState.OwnedShips.FirstOrDefault(s => s.Id == shipId);
            if (ship is null)
            {
                var rejected = new RefuelShipRejected { Reason = $"no owned ship '{shipId}'" };
                _log($"Refuel failed: {rejected.Reason}");
                return rejected;
            }

            var result = ShipRefueler.RefuelShip(ship, MarketState.Wallet, amount, DockedPlanetFor(ship));
            if (result is RefuelShipSucceeded succeeded)
            {
                ShipsState.ReplaceShip(succeeded.UpdatedShip);
                MarketState.SetWallet(succeeded.UpdatedWallet);
                _log($"Refueled {ship.Name} by {amount:F1} ({succeeded.UpdatedShip.CurrentFuel:F1}/{succeeded.UpdatedShip.FuelCapacity:F1}).");
            }
            else
            {
                _log($"Refuel failed: {((RefuelShipRejected)result).Reason}");
            }

            Refresh();
            return result;
        }

        public Ship? CheckRepair(string shipId)
        {
            var ship = ShipsState.OwnedShips.FirstOrDefault(s => s.Id == shipId);
            if (ship is null)
            {
                _log($"Check repair failed: no owned ship '{shipId}'.");
                return null;
            }

            // Migration Phase 2 Sub-Phase E integration fix
            // (agent-62-unity-planet-ownership-integration.md): passes
            // CrewState.Crew (this panel doesn't build ship-crew-role
            // assignment UI itself -- see agent-56's own scope note --
            // but the real owned-crew list is available and correct to
            // pass regardless; no crew member has a ShipRole assigned yet
            // since that UI doesn't exist, so this resolves the same as
            // before until it does) and the real Citadel-owning
            // dockedPlanet when the ship is docked there, instead of
            // always null/empty. A ship mid-voyage passes ActiveVoyage
            // instead -- the two are mutually exclusive, matching
            // ResolveComponentRepair's own contract.
            var activeVoyage = ShipsState.ActiveVoyage?.ShipId == ship.Id ? ShipsState.ActiveVoyage : null;
            var dockedPlanet = activeVoyage is null ? DockedPlanetFor(ship) : null;
            var repaired = ComponentRepairResolver.ResolveComponentRepair(ship, CrewState.Crew, activeVoyage, dockedPlanet, NowMs());
            ShipsState.ReplaceShip(repaired);
            _log($"Checked repair for {ship.Name}.");
            Refresh();
            return repaired;
        }

        // The only planet ownership currently exists for is the starting
        // planet (Sub-Phase E's own scope) -- returns its real,
        // ownership-merged Planet when the ship is docked there, or null
        // otherwise (a ship docked at GalaxyState.SecondaryDestinationPlanet,
        // which has no ownership side-table entry, correctly gets no
        // Citadel benefit).
        private static Planet? DockedPlanetFor(Ship ship) =>
            ship.CurrentPlanetId == GalaxyState.StartingPlanet.Id
                ? PlanetOwnershipState.WithOwnership(GalaxyState.StartingPlanet)
                : null;

        public InitiateVoyageResult? InitiateVoyageToSecondaryDestination(string shipId)
        {
            var ship = ShipsState.OwnedShips.FirstOrDefault(s => s.Id == shipId);
            if (ship is null)
            {
                _log($"Travel failed: no owned ship '{shipId}'.");
                return null;
            }

            var origin = GalaxyState.StartingPlanet;
            var destination = GalaxyState.SecondaryDestinationPlanet;

            InitiateVoyageResult result;
            try
            {
                result = VoyageInitiator.InitiateVoyage(ship, origin, destination, new List<VoyageCargoItem>(), NowMs(), $"voyage-{ship.Id}-{NowMs()}");
            }
            catch (InvalidOperationException ex)
            {
                _log($"Travel failed: {ex.Message}");
                return null;
            }

            ShipsState.ReplaceShip(result.UpdatedShip);
            ShipsState.SetActiveVoyage(result.Voyage);
            _log($"{ship.Name} departed for {destination.Name}, arrives at {result.Voyage.ArrivesAt:F0}ms.");
            Refresh();
            return result;
        }

        public ArrivalResult? ResolveArrival(string shipId)
        {
            var voyage = ShipsState.ActiveVoyage;
            if (voyage is null || voyage.ShipId != shipId)
            {
                _log($"Resolve arrival failed: no active voyage for '{shipId}'.");
                return null;
            }
            var ship = ShipsState.OwnedShips.FirstOrDefault(s => s.Id == shipId);
            if (ship is null)
            {
                _log($"Resolve arrival failed: no owned ship '{shipId}'.");
                return null;
            }

            var destinationPlanet = ResolveKnownPlanet(voyage.DestinationPlanetId);
            var result = ArrivalResolver.ResolveArrival(voyage, ship, NowMs(), destinationPlanet, GameContent.Loaded.Resources, _random);
            if (result is ArrivalResolved resolved)
            {
                ShipsState.ReplaceShip(resolved.UpdatedShip);
                ShipsState.SetActiveVoyage(null);
                _log($"{ship.Name} arrived at {resolved.DestinationPlanetId}.");

                foreach (var encounter in resolved.Encounters)
                {
                    ApplyEncounter(encounter);
                }
                foreach (var combat in resolved.PendingCombats)
                {
                    ShipsState.PendingCombats.Add(new ShipsState.PendingCombatEntry { Encounter = combat, ShipId = shipId, Voyage = voyage });
                    _log($"{ship.Name} encountered a hostile ship (threat tier {combat.OpponentThreatTier}).");
                }
            }
            else
            {
                _log($"Not yet arrived: {((ArrivalNotYetDue)result).Reason}");
            }

            Refresh();
            return result;
        }

        // ResolveEncounters' own contract: it only reports what happened
        // (credits to grant, resource to award, credits to lose) --
        // applying that to the real Wallet/Inventory is the caller's
        // job, same division of responsibility ArrivalResult's own doc
        // comment already draws for delivered cargo.
        private void ApplyEncounter(EncounterResult encounter)
        {
            switch (encounter)
            {
                case TradeOpportunityEncounterResult trade:
                    MarketState.SetWallet(new Wallet { PlayerId = MarketState.Wallet.PlayerId, Credits = MarketState.Wallet.Credits + trade.CreditsGranted });
                    _log($"Trade opportunity: gained {trade.CreditsGranted:F2} credits.");
                    break;
                case DiscoveryEncounterResult discovery:
                    var resource = GameContent.Loaded.Resources.First(r => r.Id == discovery.ResourceId);
                    _inventory.Add(new ResourceInstance { Resource = resource, Quantity = 1, Qualities = discovery.Qualities });
                    _log($"Discovery: found 1x {resource.Name}.");
                    break;
                case HazardEncounterResult hazard when !hazard.Passed:
                    MarketState.SetWallet(new Wallet { PlayerId = MarketState.Wallet.PlayerId, Credits = MarketState.Wallet.Credits - hazard.CreditsLost });
                    _log($"Hazard: lost {hazard.CreditsLost:F2} credits.");
                    break;
                case HazardEncounterResult:
                    _log("Hazard: avoided without loss.");
                    break;
            }
        }

        public CombatResolution? ResolveCombat(string combatEncounterId, string choice)
        {
            var pending = ShipsState.PendingCombats.FirstOrDefault(p => p.Encounter.Id == combatEncounterId);
            if (pending is null)
            {
                _log($"Resolve combat failed: no pending combat '{combatEncounterId}'.");
                return null;
            }
            var ship = ShipsState.OwnedShips.FirstOrDefault(s => s.Id == pending.ShipId);
            if (ship is null)
            {
                _log($"Resolve combat failed: no owned ship '{pending.ShipId}'.");
                return null;
            }

            var originPlanet = ResolveKnownPlanet(pending.Voyage.OriginPlanetId);
            var currentPlanet = ResolveKnownPlanet(pending.Voyage.DestinationPlanetId);
            var result = CombatChoiceResolver.ResolveCombatChoice(
                pending.Encounter, choice, pending.Voyage, ship, originPlanet, currentPlanet,
                CrewState.Crew, NowMs(), $"{pending.Voyage.Id}-retreat-{NowMs()}", _random);

            ShipsState.PendingCombats.Remove(pending);
            ShipsState.ReplaceShip(result.UpdatedShip);
            if (result.UpdatedCrewMember is not null)
            {
                var index = CrewState.Crew.FindIndex(c => c.Id == result.UpdatedCrewMember.Id);
                if (index >= 0) CrewState.Crew[index] = result.UpdatedCrewMember;
            }
            if (result.RetreatVoyage is not null)
            {
                ShipsState.SetActiveVoyage(result.RetreatVoyage);
            }
            _log($"Combat resolved ({choice}): {result.CombatEncounter.Outcome}.");

            Refresh();
            return result;
        }
    }
}
