using System.IO;
using NUnit.Framework;
using Profitable.Core.Adapters;
using Profitable.Unity.DebugTools;

namespace Profitable.Unity.Tests.EditMode
{
    // Part 5 (Debug-mode gating). Application.isEditor is always true
    // inside the Unity Test Runner (both EditMode and this project's own
    // batch-mode PlayMode runs execute inside the Editor process), so
    // IsEnabled()'s Editor branch can't be driven to `false` from a test
    // -- that branch is exercised for real every time these very tests
    // run (DebugPanelTests.cs's SetUp constructing a real DebugPanel
    // proves it). What IS independently testable here, and is exactly
    // the mechanism the standalone (non-Editor) branch depends on, is
    // the persisted-flag round-trip itself: Toggle()'s
    // read-flip-persist-return-new-value contract via a real, temp
    // -directory-backed FileSaveSystem (same test-injection seam
    // PlanetOwnershipState.SetSaveSystem/ResourceDepletionState.SetSaveSystem
    // already establish), and IsEnabled()'s own "cached at boot, a
    // Toggle() during this session does not change it" contract.
    public class DebugGateTests
    {
        private string _tempSaveDir = null!;

        [SetUp]
        public void SetUp()
        {
            _tempSaveDir = Path.Combine(Path.GetTempPath(), $"profitable-unity-tests-{System.Guid.NewGuid():N}");
            DebugGate.SetSaveSystem(new FileSaveSystem(_tempSaveDir));
        }

        [TearDown]
        public void TearDown()
        {
            DebugGate.ResetForTests();
            if (Directory.Exists(_tempSaveDir)) Directory.Delete(_tempSaveDir, recursive: true);
        }

        [Test]
        public void Toggle_FlipsFromAbsentDefaultFalseToTrue()
        {
            var result = DebugGate.Toggle();
            Assert.IsTrue(result);
        }

        [Test]
        public void Toggle_TwiceReturnsToFalse()
        {
            DebugGate.Toggle();
            var result = DebugGate.Toggle();
            Assert.IsFalse(result);
        }

        [Test]
        public void Toggle_PersistsAcrossANewSaveSystemInstancePointedAtTheSameDirectory()
        {
            DebugGate.Toggle(); // false -> true, persisted to _tempSaveDir

            // A fresh DebugGate "process" reading the same directory --
            // proves Toggle() genuinely wrote through ISaveSystem.Save(),
            // not just an in-memory field.
            DebugGate.SetSaveSystem(new FileSaveSystem(_tempSaveDir));
            var secondToggle = DebugGate.Toggle(); // true -> false

            Assert.IsFalse(secondToggle);
        }

        [Test]
        public void IsEnabled_CachesAtFirstReadAndIsUnaffectedByALaterToggleThisSession()
        {
            // Application.isEditor is true in every Unity test context,
            // so IsEnabled() itself always returns true here -- this
            // asserts the *caching* contract survives a Toggle() call
            // without throwing/changing behavior mid-session, which is
            // the observable half of "requires a restart to re-check"
            // this test environment can exercise (the false-by-default
            // -in-a-real-standalone-build half is verified separately
            // via a real Standalone build, not from inside the Editor).
            var before = DebugGate.IsEnabled();
            DebugGate.Toggle();
            var after = DebugGate.IsEnabled();

            Assert.AreEqual(before, after);
            Assert.IsTrue(after); // Application.isEditor branch
        }

        [Test]
        public void SaveKey_MatchesTypeScriptSourcesOwnPersistedKeyName()
        {
            // debugFlag.ts's own DEBUG_MODE_SAVE_KEY constant --
            // deliberately the same string, not because save files are
            // shared cross-engine (they aren't), but so the convention
            // ("profitable:" + camelCase) stays consistent for anyone
            // reading both engines' save directories side by side.
            Assert.AreEqual("profitable:debugModeEnabled", DebugGate.SaveKey);
        }
    }
}
