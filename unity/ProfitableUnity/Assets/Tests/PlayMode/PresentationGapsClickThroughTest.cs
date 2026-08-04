using System.Collections;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Profitable.Unity.Tests.PlayMode
{
    // Closes three real, previously-undocumented presentation-layer gaps
    // found during a 2026-08-04 feature-completeness audit against the
    // TypeScript alpha: Refine/Craft were hardcoded to one recipe each,
    // MapPanel had zero interactivity (travel lived entirely in
    // ShipsPanel, hardcoded to one fixed route), and MarketPanel only
    // ever sold. Same verification standard as FullLoopClickThroughTest
    // -- real Button components' real onClick in the real loaded scene,
    // not the underlying C# methods called directly.
    public class PresentationGapsClickThroughTest
    {
        // Real isolation fix, not a style nicety: FullLoopClickThroughTest
        // /MvpLoopSceneSmokeTest never needed this because neither one
        // touches ShipsState/GalaxyState/MarketState in an order
        // -sensitive way, but a PlayMode batch run shares one process
        // (and therefore every static *State class) across every
        // [UnityTest] in the run, same as within a single test -- a
        // SceneManager.LoadScene() does NOT reset them, only the
        // GameObjects. Without this, a voyage or wallet state left by an
        // earlier test in the same batch run leaks into this one (found
        // the hard way: a second real run of this suite failed on a
        // stale ActiveVoyage from a prior test's own successful voyage).
        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();
        }

        [UnityTest]
        public IEnumerator RefineAndCraftRecipeSelectorsReachANonDefaultRecipeThroughARealClick()
        {
            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            // Before this fix, no button for any recipe but Radiant Alloy
            // Bar/Ion-Forged Hull Plate existed at all -- these two
            // buttons existing and, when clicked, logging a rejection
            // that names the CLICKED recipe (not silently falling back to
            // the old hardcoded default) is the real proof the selector
            // dispatches correctly. Real refine/craft success from real
            // gathered materials is already covered by
            // RefinePanelTests/CraftPanelTests and Migration Phase 1/2's
            // own parity suites -- this test's job is proving the
            // selector, not re-proving the formula.
            Click("Button_Refine"); // nav -> Refine panel
            Click("Button_Refine Iron Ingot");
            yield return null;
            StringAssert.Contains("ferrite-ore", bootstrap.LogText, "expected the Iron Ingot recipe's own real input to appear in the rejection log");

            Click("Button_Craft"); // nav -> Craft panel
            Click("Button_Craft Iron Hull Plate");
            yield return null;
            StringAssert.Contains("Iron Ingot", bootstrap.LogText, "expected the Iron Hull Plate recipe's own real input category to appear in the rejection log");

            LogAssert.NoUnexpectedReceived();
        }

        [UnityTest]
        public IEnumerator MapPanelInitiatesARealVoyageToAClickedPlanet()
        {
            // MarketState.StartingCredits (500, matching the real TS
            // source -- see that field's own parity-fix comment)
            // comfortably covers the cheapest ship tier (Grey, 300cr,
            // ShipsAndTravelConfig.ShipPurchaseCostByTier), but not
            // necessarily whatever tier this test's own unseeded
            // shipyard-pool roll happens to produce (up to Gold, 9000cr).
            // Reusing the same test-only wallet-inflation seam
            // ShipsPanelTests.cs already established so this test isn't
            // coupled to that roll -- this test's job is proving the real
            // Map click reaches real voyage initiation, not exercising
            // the starting economy itself.
            MarketState.SetWallet(new Wallet { PlayerId = "player-1", Credits = 1_000_000 });

            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            Click("Button_Ships"); // nav -> Ships panel
            // The shipyard pool's rolled candidate id is genuinely random
            // per test run (no fixed seed -- same reasoning
            // ShipsPanelTests.cs's own comment documents), so it's found
            // by its real "Purchase ship-candidate-" prefix
            // (ShipyardPoolRefresher's own real id convention) rather
            // than an exact name. A bare "Button_Purchase " prefix is
            // NOT specific enough -- CrewPanel's own real "> Purchase
            // Capacity" button matches that shorter prefix too, and
            // FindObjectsByType's return order isn't guaranteed, so a
            // real run can click the wrong panel's button entirely
            // (found the hard way: an intermittent failure traced back
            // to this exact ambiguity, not a bug in either panel).
            ClickButtonStartingWith("Button_Purchase ship-candidate-");
            yield return null;
            StringAssert.Contains("Purchased", bootstrap.LogText);

            Click("Button_Map"); // nav -> Map panel
            // The galaxy itself is fixed-seed (deterministic), but this
            // test doesn't need to know any specific planet's name --
            // any real "Travel " button proves MapPanel is now rendering
            // real, clickable destinations from the real generated
            // galaxy, not the old static text-only display. Which planet
            // is found first isn't controlled here, and the freshly
            // -purchased ship's own rolled tier/fuel capacity is genuinely
            // random (no fixed seed, same reasoning as the shipyard pool
            // roll above) -- real fuel is a genuine routing constraint
            // (ShipsPanelTests.cs's own documented reasoning), so a real
            // click here can legitimately produce either outcome. Same
            // "definitive outcome either way" pattern
            // FullLoopClickThroughTest.cs already uses for Craft's own
            // genuinely random durability roll -- the real proof is that
            // MapPanel's click reached ShipsPanel.InitiateVoyageTo with a
            // real destination planet at all, not that this specific
            // random ship happened to have enough fuel for it.
            ClickButtonStartingWith("Button_Travel ");
            yield return null;

            var loggedTravelOutcome = bootstrap.LogText.Contains("departed for") || bootstrap.LogText.Contains("Travel failed");
            Assert.IsTrue(loggedTravelOutcome, $"expected a definitive travel outcome in the log, got:\n{bootstrap.LogText}");

            LogAssert.NoUnexpectedReceived();
        }

        [UnityTest]
        public IEnumerator MarketPanelBuysFromARealSeedListing()
        {
            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            Click("Button_Market"); // nav -> Market panel
            // Deterministic id (MarketState.CreateSeedListings' own
            // hardcoded listing id, mirroring
            // tradingState.ts's own SEED_MARKET_PLAYER_ID-owned seed
            // listings) -- the one real, immediately-buyable counterparty
            // this single-player MVP has.
            Click("Button_Buy 1 seed-listing-igneous-ore");
            yield return null;

            StringAssert.Contains("Bought", bootstrap.LogText, "expected a real purchase from the seed listing to have been logged");

            LogAssert.NoUnexpectedReceived();
        }

        // Same helper FullLoopClickThroughTest.cs already established.
        private static void Click(string buttonGameObjectName)
        {
            var button = Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(b => b.gameObject.name == buttonGameObjectName);
            Assert.IsNotNull(button, $"no button named '{buttonGameObjectName}' was found in the scene");
            button!.onClick.Invoke();
        }

        private static void ClickButtonStartingWith(string prefix)
        {
            var button = Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(b => b.gameObject.name.StartsWith(prefix));
            Assert.IsNotNull(button, $"no button starting with '{prefix}' was found in the scene");
            button!.onClick.Invoke();
        }
    }
}
