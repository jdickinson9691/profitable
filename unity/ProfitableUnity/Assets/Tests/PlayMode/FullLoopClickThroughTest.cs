using System.Collections;
using System.Linq;
using NUnit.Framework;
using Profitable.Unity.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Profitable.Unity.Tests.PlayMode
{
    // Agent 36 (Unity Migration Phase 1 Integration) --
    // docs/agents/agent-36-unity-migration-phase1-integration.md.
    //
    // Closes a real gap Agent 35's own PlayMode test left open: that test
    // only confirmed MvpLoopBootstrap BUILDS the UI, never that clicking
    // through it actually RUNS the loop. This test invokes the real
    // Button components' onClick in the real loaded scene -- nav buttons
    // to switch panels, then Gather/Refine/Craft's real buttons -- in the
    // same order a player would click. Gather is genuinely random here
    // (unlike IntegrationTests.cs's deterministic EditMode test), so this
    // only asserts the loop completes with a definitive logged outcome,
    // never a specific craft accept/reject result (see this agent's own
    // Must-Not-Do for why asserting an exact outcome here would be
    // flaky by construction, not more rigorous).
    public class FullLoopClickThroughTest
    {
        [UnityTest]
        public IEnumerator ClickingThroughGatherRefineCraftInTheRealSceneCompletesTheLoop()
        {
            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            Click("Button_Gather"); // nav -> Gather panel
            Click("Button_Gather Igneous Ore");
            Click("Button_Gather Igneous Ore"); // recipe needs 2x
            Click("Button_Gather Autunite Crystal");
            Click("Button_Gather Hydrogen Gas"); // needed later for craft
            yield return null;

            Click("Button_Refine"); // nav -> Refine panel
            Click("Button_Refine Radiant Alloy Bar");
            yield return null;

            StringAssert.Contains("Refined", bootstrap.LogText, "expected the refine action to log a result");

            Click("Button_Craft"); // nav -> Craft panel
            Click("Button_Craft Ion-Forged Hull Plate");
            yield return null;

            // A definitive outcome either way -- real randomness means
            // this scenario's durability roll could legitimately land
            // either side of the recipe's threshold.
            var loggedCraftOutcome =
                bootstrap.LogText.Contains("Crafted") || bootstrap.LogText.Contains("Craft rejected");
            Assert.IsTrue(loggedCraftOutcome, $"expected a definitive craft outcome in the log, got:\n{bootstrap.LogText}");

            LogAssert.NoUnexpectedReceived();
        }

        // Finds a Button by its exact GameObject name (see UiFactory
        // .CreateButton's "Button_{label}" naming), including inactive
        // ones -- the Gather/Refine/Craft panels start inactive until
        // their nav button is clicked, same reasoning as Agent 35's own
        // MvpLoopSceneSmokeTest.
        private static void Click(string buttonGameObjectName)
        {
            var button = Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(b => b.gameObject.name == buttonGameObjectName);
            Assert.IsNotNull(button, $"no button named '{buttonGameObjectName}' was found in the scene");
            button!.onClick.Invoke();
        }
    }
}
