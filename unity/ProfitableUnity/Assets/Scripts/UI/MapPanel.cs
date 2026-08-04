#nullable enable
using System.Linq;
using Profitable.Core.Schema;
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
    // destination-selection flow: every planet in the real generated
    // galaxy (GalaxyState.Galaxy.Planets, all 50) other than wherever
    // "the active ship" (OwnedShips[0], the same single-player
    // convention TradeMapScene.renderTravel() itself uses via
    // getShipRoster()[0] -- there is no separate concept of "the ship
    // currently selected on the map" anywhere else in this codebase to
    // hang this off of instead) is currently docked gets a real,
    // clickable Travel button, delegating to ShipsPanel's own
    // InitiateVoyageTo -- no voyage-initiation logic duplicated here.
    //
    // Deliberate divergence from TradeMapScene.ts, stated plainly rather
    // than left implicit: TS gates travel destinations to only
    // getDiscoveredPlanets() (Scanner-revealed). This Unity build has no
    // Scanner UI at all (a separate, already-documented scope gap --
    // ShipsPanel's own Sub-Phase D scope note), so gating on Discovered
    // here would leave travel permanently stuck at the same 2 planets
    // this fix is meant to open up. Every planet is treated as a valid
    // destination instead -- an honest, presentation-layer simplification
    // this comment names explicitly, not a silent behavior change.
    public class MapPanel
    {
        public GameObject Root { get; }

        private readonly ShipsPanel _shipsPanel;
        private readonly RectTransform _planetGroup;

        public MapPanel(Transform parent, ShipsPanel shipsPanel)
        {
            _shipsPanel = shipsPanel;

            var group = UiFactory.CreateVerticalGroup(parent, "MapPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Map", 20);
            var galaxy = GalaxyState.Galaxy;
            UiFactory.CreateText(group, $"Galaxy: {galaxy.Planets.Count} planets generated (seed {galaxy.Seed})", 12);

            UiFactory.CreateText(group, "Planets:", 14);
            _planetGroup = UiFactory.CreateVerticalGroup(group, "Planets");

            Refresh();
        }

        public void Refresh()
        {
            UiFactory.ClearChildren(_planetGroup);

            var galaxy = GalaxyState.Galaxy;
            var activeShip = ShipsState.OwnedShips.FirstOrDefault();
            var originPlanetId = activeShip?.CurrentPlanetId ?? GalaxyState.StartingPlanet.Id;
            var canInitiateTravel = activeShip is not null && ShipsState.ActiveVoyage is null;

            foreach (var planet in galaxy.Planets)
            {
                var row = UiFactory.CreateHorizontalGroup(_planetGroup, $"Planet_{planet.Id}");
                var marker = planet.Id == originPlanetId ? "*" : "-";
                UiFactory.CreateText(row, $"{marker} {planet.Name} [{planet.Tier}, {planet.PlanetType}] @ ({planet.Position!.X}, {planet.Position!.Y})", 11);

                if (canInitiateTravel && planet.Id != originPlanetId)
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
    }
}
