#nullable enable
using System.Collections.Generic;
using System.Linq;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace Profitable.Unity.Content
{
    // Migration Phase 2 Sub-Phase D (Ships & Travel) Presentation/
    // Integration -- docs/agents/agent-56-unity-ships-travel-presentation.md.
    // Parallels CrewState.cs/MarketState.cs's own lazy-static shape.
    //
    // Session-only, in-memory, no persistence -- same deliberate scope
    // limit every prior *State.cs class already draws. Shares
    // MarketState.Wallet for ship purchases/refuels, same reasoning
    // CrewState already established for hiring/upkeep/capacity.
    public static class ShipsState
    {
        // Migration Phase 2 Sub-Phase F (Encounters & Combat) addition --
        // docs/agents/agent-63-unity-encounters-combat-presentation.md.
        // A detected-but-unresolved CombatEncounter needs to remember
        // which ship it belongs to -- the Voyage that produced it is
        // discarded once ResolveArrival finishes (ActiveVoyage is cleared
        // immediately), so the encounter alone isn't enough to resolve a
        // later player choice against.
        public sealed class PendingCombatEntry
        {
            public CombatEncounter Encounter { get; set; } = new();
            public string ShipId { get; set; } = string.Empty;

            // The voyage that produced this encounter, kept only so a
            // later ResolveCombatChoice call can rebuild the origin/
            // current planets and cargo a retreat voyage needs -- not
            // read for any other purpose.
            public Voyage Voyage { get; set; } = new();
        }

        private static List<Ship>? _ownedShips;
        private static ShipyardPool? _shipyardPool;
        private static Voyage? _activeVoyage;
        private static List<PendingCombatEntry>? _pendingCombats;
        private static ScannerPool? _scannerPool;
        private static List<Scanner>? _ownedScanners;

        public static List<Ship> OwnedShips => _ownedShips ??= new List<Ship>();
        public static List<PendingCombatEntry> PendingCombats => _pendingCombats ??= new List<PendingCombatEntry>();
        public static List<Scanner> OwnedScanners => _ownedScanners ??= new List<Scanner>();

        public static void ReplaceShip(Ship updated)
        {
            var index = OwnedShips.FindIndex(s => s.Id == updated.Id);
            if (index >= 0) OwnedShips[index] = updated;
        }

        // Same "compare elapsed time since LastRefreshedAt against the
        // refresh interval, re-roll when stale" pattern CrewState already
        // established for its own pool -- the dead-pool-refresh fix this
        // session's earlier TypeScript work applied to
        // getShipyardPool()/getScannerPool() too.
        public static ShipyardPool GetOrRefreshShipyardPool(long nowMs)
        {
            if (_shipyardPool is null || IsStale(_shipyardPool.LastRefreshedAt, nowMs, ShipsAndTravelConfig.ShipyardPoolRefreshIntervalHours))
            {
                _shipyardPool = ShipyardPoolRefresher.RefreshShipyardPool(GalaxyState.StartingPlanet.Id, seed: null, nowMs);
            }
            return _shipyardPool;
        }

        public static void SetShipyardPool(ShipyardPool pool) => _shipyardPool = pool;

        // Scanner UI gap closed (2026-08-04) -- mirrors
        // GetOrRefreshShipyardPool's own stale-pool-refresh pattern
        // exactly, for the scanner pool this Unity build never surfaced
        // before now.
        public static ScannerPool GetOrRefreshScannerPool(long nowMs)
        {
            if (_scannerPool is null || IsStale(_scannerPool.LastRefreshedAt, nowMs, ShipsAndTravelConfig.ScannerPoolRefreshIntervalHours))
            {
                _scannerPool = ScannerPoolRefresher.RefreshScannerPool(GalaxyState.StartingPlanet.Id, seed: null, nowMs);
            }
            return _scannerPool;
        }

        public static void SetScannerPool(ScannerPool pool) => _scannerPool = pool;

        public static Voyage? ActiveVoyage => _activeVoyage;
        public static void SetActiveVoyage(Voyage? voyage) => _activeVoyage = voyage;

        private static bool IsStale(long lastRefreshedAt, long nowMs, double refreshIntervalHours)
        {
            var elapsedHours = (nowMs - lastRefreshedAt) / (60.0 * 60.0 * 1000.0);
            return elapsedHours >= refreshIntervalHours;
        }

        // Mirrors every other *State.cs's own ResetForTests() hook.
        public static void ResetForTests()
        {
            _ownedShips = null;
            _shipyardPool = null;
            _activeVoyage = null;
            _pendingCombats = null;
            _scannerPool = null;
            _ownedScanners = null;
        }
    }
}
