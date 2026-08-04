#nullable enable
using System;
using System.Linq;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;

namespace Profitable.Unity.UI
{
    // Migration Phase 2 Sub-Phase A rewrite (Presentation/Integration --
    // agent-41-unity-galaxy-planet-presentation.md), replacing Agent 35's
    // single hardcoded "Delta Rigelus" line with a real generated galaxy
    // (GalaxyState).
    //
    // Gap closed (2026-08-04): this panel used to be read-only text --
    // travel lived entirely in ShipsPanel, hardcoded to one fixed
    // StartingPlanet<->SecondaryDestinationPlanet route. Now mirrors
    // src/presentation/scenes/TradeMapScene.ts's own real
    // destination-selection flow: every DISCOVERED planet in the real
    // generated galaxy other than wherever "the active ship"
    // (OwnedShips[0], the same single-player convention
    // TradeMapScene.renderTravel() itself uses via getShipRoster()[0] --
    // there is no separate concept of "the ship currently selected on
    // the map" anywhere else in this codebase to hang this off of
    // instead) is currently docked gets a real, clickable Travel button,
    // delegating to ShipsPanel's own InitiateVoyageTo -- no
    // voyage-initiation logic duplicated here.
    //
    // Scanner gap closed (2026-08-04): this panel also now renders a
    // real Scan action (docked-ship-only, mirrors
    // TradeMapScene.renderScan()/onScan() exactly -- ScanPerformer's own
    // real NewlyDiscovered planets get written back via
    // GalaxyState.MarkDiscovered, no formula reimplemented here). This
    // closes the discovery-gate follow-up tracked in
    // docs/unity-migration-phase2-checklist.md: the whole planet list
    // (not just the travel destination sub-list, matching
    // TradeMapScene.ts's own getDiscoveredPlanets()-scoped display
    // exactly) is filtered to Discovered planets only again, now that a
    // real way to discover a planet exists in this Unity build too --
    // the "every planet is a valid destination" stopgap this comment
    // used to describe is gone.
    public class MapPanel
    {
        public GameObject Root { get; }

        private readonly ShipsPanel _shipsPanel;
        private readonly Action<string> _log;
        private readonly RectTransform _scanGroup;
        private readonly RectTransform _planetGroup;

        public MapPanel(Transform parent, ShipsPanel shipsPanel, Action<string> log)
        {
            _shipsPanel = shipsPanel;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "MapPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Map", 20);
            var galaxy = GalaxyState.Galaxy;
            UiFactory.CreateText(group, $"Galaxy: {galaxy.Planets.Count} planets generated (seed {galaxy.Seed})", 12);

            _scanGroup = UiFactory.CreateHorizontalGroup(group, "Scan");

            UiFactory.CreateText(group, "Discovered planets:", 14);
            _planetGroup = UiFactory.CreateVerticalGroup(group, "Planets");

            Refresh();
        }

        public void Refresh()
        {
            var galaxy = GalaxyState.Galaxy;
            var activeShip = ShipsState.OwnedShips.FirstOrDefault();
            var originPlanetId = activeShip?.CurrentPlanetId ?? GalaxyState.StartingPlanet.Id;
            var shipIsDockedAndFree = activeShip is not null && ShipsState.ActiveVoyage is null;

            UiFactory.ClearChildren(_scanGroup);
            // Docked-ship-only, same "not en route" gate ShipsAndTravel's
            // own renderScan() call site (renderTravel()) restricts to --
            // never shown while a voyage is in progress.
            if (shipIsDockedAndFree)
            {
                var owned = ShipsState.OwnedScanners;
                var label = owned.Count == 0
                    ? "no scanner owned -- purchase one at the Shipyard to scan for nearby planets"
                    : $"Scanners owned: {string.Join(", ", owned.Select(s => s.Tier))}";
                UiFactory.CreateText(_scanGroup, label, 12);
                if (owned.Count > 0)
                {
                    UiFactory.CreateButton(_scanGroup, "Scan", () => Scan());
                }
            }

            UiFactory.ClearChildren(_planetGroup);
            foreach (var planet in galaxy.Planets.Where(p => p.Discovered == true))
            {
                var row = UiFactory.CreateHorizontalGroup(_planetGroup, $"Planet_{planet.Id}");
                var marker = planet.Id == originPlanetId ? "*" : "-";
                UiFactory.CreateText(row, $"{marker} {planet.Name} [{planet.Tier}, {planet.PlanetType}] @ ({planet.Position!.X}, {planet.Position!.Y})", 11);

                if (shipIsDockedAndFree && planet.Id != originPlanetId)
                {
                    UiFactory.CreateButton(row, $"Travel {planet.Name}", () => TravelTo(planet.Id));
                }
            }
        }

        // Public entry point -- exercised directly by EditMode tests
        // (real Button.onClick invokes this same method), same
        // convention as every other panel's trigger methods. All actual
        // voyage-initiation logic lives in ShipsPanel.InitiateVoyageTo --
        // this only resolves which ship "the map" acts on and refreshes
        // its own planet list afterward.
        public InitiateVoyageResult? TravelTo(string destinationPlanetId)
        {
            var activeShip = ShipsState.OwnedShips.FirstOrDefault();
            if (activeShip is null) return null;

            var result = _shipsPanel.InitiateVoyageTo(activeShip.Id, destinationPlanetId);
            Refresh();
            return result;
        }

        // Ports TradeMapScene.ts's onScan() -- real ScanPerformer call,
        // real discovery written back via GalaxyState.MarkDiscovered
        // (the presentation-layer's job per performScan()'s own
        // contract, same division of responsibility ArrivalResult's own
        // doc comment already draws for delivered cargo/encounters).
        public PerformScanResult? Scan()
        {
            var activeShip = ShipsState.OwnedShips.FirstOrDefault();
            if (activeShip is null) return null;

            var dockedPlanet = GalaxyState.Galaxy.Planets.FirstOrDefault(p => p.Id == activeShip.CurrentPlanetId);
            if (dockedPlanet is null) return null;

            var result = ScanPerformer.PerformScan(activeShip, dockedPlanet, ShipsState.OwnedScanners, GalaxyState.Galaxy.Planets);
            if (result is ScanRejected rejected)
            {
                _log($"Scan failed: {rejected.Reason}");
                return result;
            }

            var succeeded = (ScanSucceeded)result;
            foreach (var planet in succeeded.NewlyDiscovered)
            {
                GalaxyState.MarkDiscovered(planet.Id);
            }

            _log(succeeded.NewlyDiscovered.Count > 0
                ? $"Scan complete -- newly discovered: {string.Join(", ", succeeded.NewlyDiscovered.Select(p => p.Name))}"
                : "Scan complete -- no new planets found within range.");

            Refresh();
            return result;
        }
    }
}
