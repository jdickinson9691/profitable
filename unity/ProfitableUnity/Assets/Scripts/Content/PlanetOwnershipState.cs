#nullable enable
using System.Collections.Generic;
using System.Text.Json;
using Profitable.Core.Adapters;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using UnityEngine;

namespace Profitable.Unity.Content
{
    // Migration Phase 2 Sub-Phase E (Planet Ownership) Presentation/
    // Integration -- docs/agents/agent-61-unity-planet-ownership
    // -presentation.md. Mirrors src/presentation/planetOwnershipState.ts's
    // own persisted side-table pattern.
    //
    // Unlike every prior *State.cs class in this migration (GalaxyState,
    // MarketState, CrewState, ShipsState -- all deliberately session-only,
    // "persistence is a later phase's job"), this one IS real, working
    // persistence -- the first actual Adapters.ISaveSystem use anywhere in
    // this migration's Presentation layer. This isn't a scope creep: the
    // checklist's own Sub-Phase E Phase Integration requirement is
    // explicit ("confirm colonizing/claiming/building... persists
    // correctly across a reload"), unlike every earlier sub-phase's own
    // deliberately-deferred persistence.
    public static class PlanetOwnershipState
    {
        private const string SaveKey = "profitable:planetOwnershipState";
        private const string PlayerId = "player-1";

        private static ISaveSystem? _saveSystem;
        private static Dictionary<string, PlanetOwnershipEntry>? _state;

        private static ISaveSystem SaveSystemInstance => _saveSystem ??= new FileSaveSystem(Application.persistentDataPath);

        // Test-injection seam -- mirrors FileSaveSystem's own constructor
        // -injected base-directory precedent ("swap implementation, keep
        // interface"). EditMode tests inject a temp-directory-backed
        // FileSaveSystem for isolation; production code never calls this
        // and gets the real Application.persistentDataPath-backed
        // instance by default.
        public static void SetSaveSystem(ISaveSystem saveSystem)
        {
            _saveSystem = saveSystem;
            _state = null;
        }

        private static Dictionary<string, PlanetOwnershipEntry> State => _state ??= Load();

        private static Dictionary<string, PlanetOwnershipEntry> Load()
        {
            var raw = SaveSystemInstance.Load(SaveKey);
            if (raw is null) return new Dictionary<string, PlanetOwnershipEntry>();

            // FileSaveSystem.Load returns a boxed JsonElement for object
            // data (System.Text.Json's own behavior when the static
            // return type is `object`) -- re-deserialize into the real
            // shape rather than trusting the boxed value directly.
            var json = ((JsonElement)raw).GetRawText();
            return JsonSerializer.Deserialize<Dictionary<string, PlanetOwnershipEntry>>(json) ?? new Dictionary<string, PlanetOwnershipEntry>();
        }

        private static void Persist() => SaveSystemInstance.Save(SaveKey, State);

        public static PlanetOwnershipEntry GetEntry(string planetId) =>
            State.TryGetValue(planetId, out var entry) ? entry : PlanetOwnershipEntry.Default();

        public static void SetEntry(string planetId, PlanetOwnershipEntry entry)
        {
            State[planetId] = entry;
            Persist();
        }

        // The single source of truth every gameplay caller should use
        // instead of reading a raw, unmerged Planet -- mirrors
        // withPlanetOwnership()'s own "merge at read time" pattern.
        public static Planet WithOwnership(Planet planet) =>
            PlanetOwnershipMerger.MergePlanetOwnership(planet, State.TryGetValue(planet.Id, out var entry) ? entry : null);

        // Bootstrap exception (planet-ownership.md): the starting planet
        // is pre-colonized. Floor-set, not overwrite -- ColonistCount =
        // max(existing, MinimumColonistsToProduce) -- safe to call every
        // session (GalaxyState itself has no persistence of its own, so
        // there's no cheap way to distinguish "brand new save" from
        // "existing save reloading" the way the TypeScript source's own
        // isNewGalaxy check does), never claws back colonists a player
        // transported beyond the minimum.
        public static void EnsureBootstrapColonization(string planetId)
        {
            var existing = GetEntry(planetId);
            var floored = System.Math.Max(existing.ColonistCount, PlanetOwnershipConstants.MinimumColonistsToProduce);
            if (floored != existing.ColonistCount)
            {
                SetEntry(planetId, new PlanetOwnershipEntry { ColonistCount = floored, CitadelLevel = existing.CitadelLevel, OwnedByPlayerId = existing.OwnedByPlayerId });
            }
        }

        public static string DefaultPlayerId => PlayerId;

        // Mirrors every other *State.cs's own ResetForTests() hook.
        public static void ResetForTests()
        {
            _state = null;
            _saveSystem = null;
        }
    }
}
