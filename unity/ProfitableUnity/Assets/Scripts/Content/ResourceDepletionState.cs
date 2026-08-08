#nullable enable
using System.Collections.Generic;
using System.Text.Json;
using Profitable.Core.Adapters;
using Profitable.Core.Simulation;
using UnityEngine;

namespace Profitable.Unity.Content
{
    // Per-Resource Quantity Caps. Mirrors PlanetOwnershipState.cs's own
    // SaveSystem-backed persisted side-table pattern exactly, keyed one
    // level deeper since this tracks a (planetId, resourceId) pair rather
    // than just planetId.
    public static class ResourceDepletionState
    {
        private const string SaveKey = "profitable:resourceDepletionState";

        private static ISaveSystem? _saveSystem;
        private static Dictionary<string, Dictionary<string, ResourceDepletion.ResourceDepletionEntry>>? _state;

        private static ISaveSystem SaveSystemInstance => _saveSystem ??= new FileSaveSystem(Application.persistentDataPath);

        // Test-injection seam -- same convention as PlanetOwnershipState's own.
        public static void SetSaveSystem(ISaveSystem saveSystem)
        {
            _saveSystem = saveSystem;
            _state = null;
        }

        private static Dictionary<string, Dictionary<string, ResourceDepletion.ResourceDepletionEntry>> State => _state ??= Load();

        private static Dictionary<string, Dictionary<string, ResourceDepletion.ResourceDepletionEntry>> Load()
        {
            var raw = SaveSystemInstance.Load(SaveKey);
            if (raw is null) return new Dictionary<string, Dictionary<string, ResourceDepletion.ResourceDepletionEntry>>();

            // Same boxed-JsonElement re-deserialization as PlanetOwnershipState.Load --
            // FileSaveSystem.Load returns a boxed JsonElement for object data.
            var json = ((JsonElement)raw).GetRawText();
            return JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, ResourceDepletion.ResourceDepletionEntry>>>(json)
                   ?? new Dictionary<string, Dictionary<string, ResourceDepletion.ResourceDepletionEntry>>();
        }

        private static void Persist() => SaveSystemInstance.Save(SaveKey, State);

        public static ResourceDepletion.ResourceDepletionEntry? GetEntry(string planetId, string resourceId) =>
            State.TryGetValue(planetId, out var byResource) && byResource.TryGetValue(resourceId, out var entry) ? entry : null;

        // Reads the current entry, advances it through ResourceDepletion's
        // own pure RecordGather(), and persists -- the only place in this
        // class that calls the core function, same "caller owns
        // persistence, core owns the formula" boundary
        // PlanetOwnershipState's own SetEntry follows.
        public static ResourceDepletion.ResourceDepletionEntry RecordGather(string planetId, string resourceId, int currentCycleIndex, int quantity = 1)
        {
            var existing = GetEntry(planetId, resourceId);
            var next = ResourceDepletion.RecordGather(existing, currentCycleIndex, quantity);

            if (!State.TryGetValue(planetId, out var byResource))
            {
                byResource = new Dictionary<string, ResourceDepletion.ResourceDepletionEntry>();
                State[planetId] = byResource;
            }
            byResource[resourceId] = next;
            Persist();
            return next;
        }

        // Mirrors every other *State.cs's own ResetForTests() hook.
        public static void ResetForTests()
        {
            _state = null;
            _saveSystem = null;
        }
    }
}
