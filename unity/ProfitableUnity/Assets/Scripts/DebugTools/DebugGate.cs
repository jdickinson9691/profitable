#nullable enable
using System.Text.Json;
using Profitable.Core.Adapters;
using UnityEngine;

namespace Profitable.Unity.DebugTools
{
    // Ports src/presentation/debugFlag.ts's isDebugModeEnabled(). Two
    // independent paths, chosen by build type:
    //
    // Editor: Application.isEditor gates it directly -- the Unity
    // equivalent of TS's import.meta.env.DEV dev-server branch (always
    // reachable while developing in the Editor; Application.isEditor is
    // always false in a real built player, so this branch can never make
    // a shipped standalone build start in debug mode).
    //
    // Standalone (a built player): no Editor, no URL bar to type a
    // ?debug=1 param into -- a flag persisted through the same
    // Adapters.ISaveSystem PlanetOwnershipState.cs/ResourceDepletionState.cs
    // already use, toggled only by a keyboard shortcut
    // (Toggle(), wired in MvpLoopBootstrap.Update()) -- absent/false by
    // default, so a packaged build never starts in debug mode without
    // that deliberate action, same principle as the TS source's own
    // absent-by-default saveSystem-backed flag.
    //
    // Re-checked only once per process (IsEnabled() caches its result the
    // first time it's read) -- mirrors TS's own location.reload()
    // re-check pattern: Toggle() flips the persisted flag for the NEXT
    // boot, but does not itself change what IsEnabled() returns for the
    // rest of the current session, so a standalone build genuinely
    // requires a restart before the Debug nav entry/panel becomes (or
    // stops being) reachable.
    public static class DebugGate
    {
        public const string SaveKey = "profitable:debugModeEnabled";

        private static ISaveSystem? _saveSystem;
        private static bool? _cachedAtBoot;

        private static ISaveSystem SaveSystemInstance => _saveSystem ??= new FileSaveSystem(Application.persistentDataPath);

        // Test-injection seam -- mirrors PlanetOwnershipState.SetSaveSystem/
        // ResourceDepletionState.SetSaveSystem exactly.
        public static void SetSaveSystem(ISaveSystem saveSystem)
        {
            _saveSystem = saveSystem;
            _cachedAtBoot = null;
        }

        public static bool IsEnabled()
        {
            if (Application.isEditor) return true;
            return _cachedAtBoot ??= LoadPersistedFlag();
        }

        // Flips the persisted flag and returns the new persisted value.
        // Deliberately does not touch _cachedAtBoot -- IsEnabled() must
        // keep returning this session's original answer until an actual
        // restart re-reads the flag from disk.
        public static bool Toggle()
        {
            var newValue = !LoadPersistedFlag();
            SaveSystemInstance.Save(SaveKey, newValue);
            return newValue;
        }

        private static bool LoadPersistedFlag()
        {
            var raw = SaveSystemInstance.Load(SaveKey);
            if (raw is null) return false;

            // FileSaveSystem.Load returns a boxed JsonElement for a
            // primitive too (System.Text.Json's Deserialize<object?>
            // behavior) -- same unboxing PlanetOwnershipState.Load()'s
            // own comment documents for the Dictionary case.
            return ((JsonElement)raw).GetBoolean();
        }

        public static void ResetForTests()
        {
            _cachedAtBoot = null;
            _saveSystem = null;
        }
    }
}
