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
    // covers hiring/upkeep/dismiss without touching ship roles), scanner
    // purchase/scan UI, or combat/encounter resolution UI -- each is a
    // real, separate presentation surface of its own scope (ship-crew
    // roles interact with CrewPanel's roster, not this panel's ships;
    // combat/encounters are Sub-Phase F's own Presentation job, since
    // ResolveEncounters/ResolveCombatChoice were ported here as a schema
    // dependency, not a claim that their UI is in scope here too). Only
    // one active voyage is tracked at a time (ShipsState.ActiveVoyage),
    // matching this MVP's existing "one thing at a time" simplicity
    // rather than a full multi-ship concurrent-voyage manager.
    public class ShipsPanel
    {
        public GameObject Root { get; }

        private readonly Action<string> _log;
        private readonly Text _statusText;
        private readonly RectTransform _shipyardGroup;
        private readonly RectTransform _shipsGroup;

        public ShipsPanel(Transform parent, Action<string> log)
        {
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "ShipsPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Ships", 20);
            _statusText = UiFactory.CreateText(group, "", 13);

            UiFactory.CreateText(group, "Shipyard:", 14);
            _shipyardGroup = UiFactory.CreateVerticalGroup(group, "Shipyard");

            UiFactory.CreateText(group, "Owned ships:", 14);
            _shipsGroup = UiFactory.CreateVerticalGroup(group, "OwnedShips");

            Refresh();
        }

        private static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

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

            var result = ArrivalResolver.ResolveArrival(voyage, ship, NowMs());
            if (result is ArrivalResolved resolved)
            {
                ShipsState.ReplaceShip(resolved.UpdatedShip);
                ShipsState.SetActiveVoyage(null);
                _log($"{ship.Name} arrived at {resolved.DestinationPlanetId}.");
            }
            else
            {
                _log($"Not yet arrived: {((ArrivalNotYetDue)result).Reason}");
            }

            Refresh();
            return result;
        }
    }
}
