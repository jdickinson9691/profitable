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
        private static List<Ship>? _ownedShips;
        private static ShipyardPool? _shipyardPool;
        private static Voyage? _activeVoyage;

        public static List<Ship> OwnedShips => _ownedShips ??= new List<Ship>();

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
        }
    }
}
