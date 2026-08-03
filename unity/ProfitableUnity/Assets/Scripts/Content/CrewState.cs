#nullable enable
using System.Collections.Generic;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace Profitable.Unity.Content
{
    // Migration Phase 2 Sub-Phase C (Crew) Presentation/Integration --
    // docs/agents/agent-51-unity-crew-presentation.md. Parallels
    // GalaxyState.cs/MarketState.cs's own lazy-static shape.
    //
    // Session-only, in-memory, no persistence -- same deliberate scope
    // limit every prior *State.cs class already draws. Shares
    // MarketState.Wallet as the single player's Credits balance (hiring/
    // upkeep/capacity-purchase all spend the same Credits gathering/
    // selling earns), rather than a second independent wallet.
    public static class CrewState
    {
        private const string PlayerId = "player-1";

        private static CrewCapacity? _capacity;
        private static List<CrewMember>? _crew;
        private static PlanetCrewPool? _pool;

        public static CrewCapacity Capacity => _capacity ??= new CrewCapacity
        {
            PlayerId = PlayerId,
            BaseCapacity = CrewConfig.BaseCrewCapacity,
            PurchasedSlots = 0,
        };

        public static void SetCapacity(CrewCapacity capacity) => _capacity = capacity;

        public static List<CrewMember> Crew => _crew ??= new List<CrewMember>();

        // Lazily refreshes the starting planet's crew pool, and re-rolls
        // it whenever it goes stale -- the same "compare elapsed time
        // since lastRefreshedAt against the refresh interval" pattern
        // this session's own TypeScript work already fixed for
        // getCrewPool()/getShipyardPool()/getScannerPool(), so the Unity
        // port doesn't reintroduce a dead-pool-refresh regression.
        public static PlanetCrewPool GetOrRefreshPool(long nowMs)
        {
            if (_pool is null || IsStale(_pool, nowMs))
            {
                _pool = RefreshCrewPoolSimulation.RefreshCrewPool(GalaxyState.StartingPlanet.Id, seed: null, nowMs);
            }
            return _pool;
        }

        public static void SetPool(PlanetCrewPool pool) => _pool = pool;

        private static bool IsStale(PlanetCrewPool pool, long nowMs)
        {
            var elapsedHours = (nowMs - pool.LastRefreshedAt) / (60.0 * 60.0 * 1000.0);
            return elapsedHours >= CrewConfig.CrewPoolRefreshIntervalHours;
        }

        // Mirrors every other *State.cs's own ResetForTests() hook.
        public static void ResetForTests()
        {
            _capacity = null;
            _crew = null;
            _pool = null;
        }
    }
}
