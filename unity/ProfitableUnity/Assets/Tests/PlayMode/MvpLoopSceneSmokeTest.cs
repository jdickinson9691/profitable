using System.Collections;
using NUnit.Framework;
using Profitable.Unity.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Profitable.Unity.Tests.PlayMode
{
    // Agent 35 -- closes a real gap the EditMode tests leave open: none
    // of them ever load Assets/Scenes/MvpLoop.unity or exercise
    // MvpLoopBootstrap itself (they build panels directly against a bare
    // test GameObject). This proves the actual scene, in actual Play
    // mode, builds its UI hierarchy without error -- the literal claim
    // in this agent's own Definition of Done ("a player can open
    // MvpLoop.unity and press Play").
    public class MvpLoopSceneSmokeTest
    {
        [UnityTest]
        public IEnumerator SceneLoadsAndBootstrapBuildsTheFullUiHierarchyWithoutErrors()
        {
            SceneManager.LoadScene("MvpLoop");
            yield return null; // let Awake() run
            yield return null; // let one full frame settle

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap, "MvpLoopBootstrap was not found in the loaded scene");

            var canvas = Object.FindFirstObjectByType<Canvas>();
            Assert.IsNotNull(canvas, "Bootstrap did not build a Canvas");

            // includeInactive: true -- only the Map panel is shown by
            // default (ShowOnly() deactivates the other three), so
            // Gather/Refine/Craft's buttons are real but inactive at
            // this point. Counting only active objects would
            // undercount buttons that exist correctly but aren't the
            // currently-visible panel -- a test artifact, not a bug in
            // the panel-switching behavior itself.
            var buttons = Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            // 4 nav buttons + 3 gather buttons + 1 refine + 1 craft + 7
            // refine-tier-picker + 14 craft-tier-picker (schematic +
            // crafter) = 30. Asserting a minimum, not an exact count, so
            // this doesn't become a brittle tripwire on cosmetic changes.
            Assert.GreaterOrEqual(buttons.Length, 10, "expected at least the nav + gather + refine + craft buttons to exist");

            var canvasText = canvas.GetComponentsInChildren<Text>(includeInactive: true);
            Assert.IsTrue(
                System.Array.Exists(canvasText, t => t.text.Contains("Delta Rigelus")),
                "MapPanel's starting-planet label was not found in the built UI");
        }
    }
}
