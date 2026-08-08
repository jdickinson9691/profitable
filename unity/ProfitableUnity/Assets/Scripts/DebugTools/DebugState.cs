using Profitable.Core.Schema;

namespace Profitable.Unity.DebugTools
{
    // Ports src/presentation/debugState.ts. A one-shot "force the next
    // voyage arrival to include this encounter type" request, set by
    // DebugPanel and consumed+cleared by ShipsPanel.ResolveArrival() on
    // the very next call. Session-only (deliberately not routed through
    // ISaveSystem) -- this is a live testing shortcut for the current
    // session, not save data a player's game should carry, matching the
    // TypeScript source's own module-level (not SaveSystem-backed)
    // storage exactly.
    public static class DebugState
    {
        private static EncounterType? _forcedEncounterType;

        public static void SetForcedEncounterType(EncounterType? type) => _forcedEncounterType = type;

        public static EncounterType? GetForcedEncounterType() => _forcedEncounterType;

        // Consumes (reads + clears) in one step, so a single request only
        // ever affects the very next ResolveArrival() call, never a
        // second one by accident.
        public static EncounterType? ConsumeForcedEncounterType()
        {
            var type = _forcedEncounterType;
            _forcedEncounterType = null;
            return type;
        }

        public static void ResetForTests() => _forcedEncounterType = null;
    }
}
