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
    // -arrival, the real core loop `ship.md`/`travel.md` describe.
    // Deliberately does NOT include ship-crew-role assignment UI (Pilot/
    // Combat Engineer/etc. -- CrewPanel already covers hiring/upkeep/
    // dismiss without touching ship roles), a real, separate
    // presentation surface this panel doesn't claim.
    //
    // Scanner purchase gap closed (2026-08-04): scanner purchase lives
    // here (mirrors ShipyardScene.ts's own "scanners for sale alongside
    // ships" placement); the actual scan action lives in MapPanel
    // instead (mirrors TradeMapScene.ts's own placement) -- purchase and
    // scan were never the same screen on the TypeScript side either.
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
        private readonly RectTransform _scannerShopGroup;
        private readonly RectTransform _ownedScannersGroup;

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

            UiFactory.CreateText(group, "Scanners for sale:", 14);
            _scannerShopGroup = UiFactory.CreateVerticalGroup(group, "ScannerShop");

            UiFactory.CreateText(group, "Owned scanners:", 14);
            _ownedScannersGroup = UiFactory.CreateVerticalGroup(group, "OwnedScanners");

            UiFactory.CreateText(group, "Pending combat:", 14);
            _pendingCombatsGroup = UiFactory.CreateVerticalGroup(group, "PendingCombats");

            Refresh();
        }

        private static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        // Gap closed (2026-08-04): originally special-cased to only the
        // two planets this MVP's travel loop used to ever move between.
        // Now resolves any real planet from the generated galaxy
        // (GalaxyState.Galaxy.Planets, all 50) through the same
        // ownership-merge every other planet lookup already goes
        // through -- PlanetOwnershipState.WithOwnership gracefully
        // defaults for a planet with no ownership entry, so this is
        // correct for both the two originally-special-cased planets and
        // every newly-reachable one alike.
        private static Planet ResolveKnownPlanet(string planetId) =>
            PlanetOwnershipState.WithOwnership(GalaxyState.Galaxy.Planets.First(p => p.Id == planetId));

        public void Refresh()
        {
            var voyage = ShipsState.ActiveVoyage;
            var voyageStatus = voyage is null
                ? "no active voyage"
                : $"voyage to {ResolveKnownPlanet(voyage.DestinationPlanetId).Name}, arrives at {voyage.ArrivesAt:F0}ms (now {NowMs()}ms)";
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

            UiFactory.ClearChildren(_scannerShopGroup);
            var scannerPool = ShipsState.GetOrRefreshScannerPool(NowMs());
            foreach (var candidate in scannerPool.AvailableScanners)
            {
                var row = UiFactory.CreateHorizontalGroup(_scannerShopGroup, $"ScannerCandidate_{candidate.Id}");
                UiFactory.CreateText(row, $"{candidate.Tier} tier scanner", 12);
                UiFactory.CreateButton(row, $"Purchase Scanner {candidate.Id}", () => PurchaseScanner(candidate.Id));
            }

            UiFactory.ClearChildren(_ownedScannersGroup);
            // "In use" mirrors ShipyardScene.ts's own renderScannerRoster()
            // display -- highest tier only, never summed (ScanPerformer's
            // own rule), shown here for legibility, never recomputed.
            var highestOwnedTier = ShipsState.OwnedScanners.Count == 0
                ? (TierColor?)null
                : ShipsState.OwnedScanners.Max(s => s.Tier);
            foreach (var scanner in ShipsState.OwnedScanners)
            {
                var row = UiFactory.CreateHorizontalGroup(_ownedScannersGroup, $"Scanner_{scanner.Id}");
                var inUse = scanner.Tier == highestOwnedTier ? " (in use for scanning)" : "";
                UiFactory.CreateText(row, $"{scanner.Tier} tier scanner{inUse}", 12);
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

        // Ports ShipyardScene.ts's onPurchaseScanner() -- mirrors
        // PurchaseShip exactly, same real Core call, same pool/wallet
        // update pattern.
        public PurchaseScannerResult PurchaseScanner(string candidateId)
        {
            var pool = ShipsState.GetOrRefreshScannerPool(NowMs());
            var candidate = pool.AvailableScanners.FirstOrDefault(c => c.Id == candidateId);
            if (candidate is null)
            {
                var rejected = new PurchaseScannerRejected { Reason = $"'{candidateId}' is not in this planet's scanner pool" };
                _log($"Purchase failed: {rejected.Reason}");
                return rejected;
            }

            var result = ScannerPurchaser.PurchaseScanner(candidate, pool, MarketState.Wallet, MarketState.Wallet.PlayerId);
            if (result is PurchaseScannerSucceeded succeeded)
            {
                ShipsState.OwnedScanners.Add(succeeded.Scanner);
                ShipsState.SetScannerPool(succeeded.UpdatedPool);
                MarketState.SetWallet(succeeded.UpdatedWallet);
                _log($"Purchased a {succeeded.Scanner.Tier} tier scanner.");
            }
            else
            {
                _log($"Purchase failed: {((PurchaseScannerRejected)result).Reason}");
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

        // Gap closed (2026-08-04): Citadel benefit lookups used to only
        // ever resolve for a ship docked at the starting planet -- the
        // only planet ownership could ever apply to before map-based
        // travel existed. PlanetOwnershipState.WithOwnership (via
        // ResolveKnownPlanet) already defaults gracefully for a planet
        // with no ownership entry, so this now correctly resolves for a
        // ship docked anywhere in the real galaxy, not just the two
        // originally-special-cased planets.
        private static Planet DockedPlanetFor(Ship ship) => ResolveKnownPlanet(ship.CurrentPlanetId);

        // Gap closed (2026-08-04): generalizes what was
        // InitiateVoyageToSecondaryDestination's own hardcoded
        // StartingPlanet -> SecondaryDestinationPlanet route into a real
        // "travel from wherever this ship is docked to any other real
        // galaxy planet" entry point -- mirrors
        // src/presentation/scenes/TradeMapScene.ts's own
        // initiateVoyage() call site exactly (real origin/destination
        // Planet objects, no formula reimplemented here). The "already
        // has an active voyage" guard is new: the old method relied
        // entirely on Refresh()'s own button-visibility gating to
        // prevent a second voyage, which was sufficient when Travel had
        // exactly one entry point (this panel's own button) but is not
        // once MapPanel gained a second, independent one.
        public InitiateVoyageResult? InitiateVoyageTo(string shipId, string destinationPlanetId)
        {
            var ship = ShipsState.OwnedShips.FirstOrDefault(s => s.Id == shipId);
            if (ship is null)
            {
                _log($"Travel failed: no owned ship '{shipId}'.");
                return null;
            }
            if (ShipsState.ActiveVoyage is not null)
            {
                _log("Travel failed: a voyage is already in progress.");
                return null;
            }

            var origin = ResolveKnownPlanet(ship.CurrentPlanetId);
            var destination = ResolveKnownPlanet(destinationPlanetId);

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

        // Kept as a thin wrapper -- this panel's own "Travel {ship.Id}"
        // button (Refresh(), below) and every existing test still call
        // this exact name/signature.
        public InitiateVoyageResult? InitiateVoyageToSecondaryDestination(string shipId) =>
            InitiateVoyageTo(shipId, GalaxyState.SecondaryDestinationPlanet.Id);

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
