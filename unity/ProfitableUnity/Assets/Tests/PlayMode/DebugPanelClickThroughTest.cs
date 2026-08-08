using System.Collections;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Constants;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Profitable.Unity.Tests.PlayMode
{
    // Real click-through proof for DebugPanel.cs -- same standard
    // FullLoopClickThroughTest.cs/ShipAssemblyPanelClickThroughTest.cs/
    // ShipCrewRolesPanelClickThroughTest.cs already establish: real
    // Button components' real onClick in the real loaded MvpLoop scene,
    // not a directly-constructed panel instance (DebugPanelTests.cs's
    // own EditMode coverage already proves the latter -- this is the
    // missing "does the real nav button + real scene wiring actually
    // reach it" half, matching this project's own "verified genuine, not
    // vacuous" standard). Mirrors the original TS panel's own
    // 2%->20% Baseline Drift verification: repeated real clicks on the
    // real stepper move the real exported TradingConfig.BaselineDriftPercent
    // constant from its 2% default to 20%.
    public class DebugPanelClickThroughTest
    {
        private double _originalBaselineDriftPercent;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();

            // Real, static, process-lifetime Constants property -- save
            // /restore around this test so it can't leak into another
            // test elsewhere in this same PlayMode batch run.
            _originalBaselineDriftPercent = TradingConfig.BaselineDriftPercent;
        }

        [TearDown]
        public void TearDown()
        {
            TradingConfig.BaselineDriftPercent = _originalBaselineDriftPercent;
        }

        [UnityTest]
        public IEnumerator ClickingTheRealStepperInTheLoadedSceneMovesBaselineDriftFrom2PercentTo20Percent()
        {
            Assert.AreEqual(0.02, TradingConfig.BaselineDriftPercent, 0.0001, "expected the real 2% default before any click");

            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            Click("Button_Debug"); // nav -> Debug panel (Application.isEditor is true for every PlayMode run, so DebugGate.IsEnabled() and the panel/button both exist)
            yield return null;

            // Step is 0.005 -- 36 real clicks moves 0.02 -> 0.20, mirroring
            // the original TS panel's own 2%->20% Baseline Drift proof.
            for (var i = 0; i < 36; i++)
            {
                Click("Button_+ Baseline drift %/unit");
            }
            yield return null;

            Assert.AreEqual(0.20, TradingConfig.BaselineDriftPercent, 0.0001,
                "36 real clicks on the real [+] stepper must move the real, exported TradingConfig.BaselineDriftPercent constant from 2% to 20% -- not just update the panel's own displayed text");

            LogAssert.NoUnexpectedReceived();
        }

        // Same helper FullLoopClickThroughTest.cs/
        // ShipAssemblyPanelClickThroughTest.cs/
        // ShipCrewRolesPanelClickThroughTest.cs already establish.
        private static void Click(string buttonGameObjectName)
        {
            var button = Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(b => b.gameObject.name == buttonGameObjectName);
            Assert.IsNotNull(button, $"no button named '{buttonGameObjectName}' was found in the scene");
            button!.onClick.Invoke();
        }
    }
}
