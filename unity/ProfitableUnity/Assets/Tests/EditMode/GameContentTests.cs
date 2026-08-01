using NUnit.Framework;
using Profitable.Unity.Content;

namespace Profitable.Unity.Tests.EditMode
{
    // Agent 35 -- confirms GameContent actually loads the real, current
    // content/*.json files (copied into StreamingAssets), not synthetic
    // data. Mirrors the same "prove it against the real files" standard
    // Agent 31's ContentLoaderRealFilesTests already established.
    public class GameContentTests
    {
        [SetUp]
        public void SetUp() => GameContent.ResetForTests();

        [Test]
        public void LoadsAllSixtyResources()
        {
            Assert.AreEqual(60, GameContent.Loaded.Resources.Count);
        }

        [Test]
        public void StartingPlanetIsDeltaRigelus()
        {
            Assert.AreEqual("Delta Rigelus", GameContent.StartingPlanet.Name);
        }

        [Test]
        public void MvpResourcesAreFoundById()
        {
            Assert.AreEqual("igneous-ore", GameContent.IgneousOre.Id);
            Assert.AreEqual("hydrogen-gas", GameContent.HydrogenGas.Id);
            Assert.AreEqual("autunite-crystal", GameContent.AutuniteCrystal.Id);
            Assert.AreEqual("radiant-alloy-bar", GameContent.RadiantAlloyBar.Id);
        }

        [Test]
        public void RadiantAlloyBarRecipeMatchesTheRealMvpRecipe()
        {
            var recipe = GameContent.RadiantAlloyBarRecipe;
            Assert.AreEqual(2, recipe.Inputs.Count);
            Assert.AreEqual("igneous-ore", recipe.Inputs[0].ResourceId);
            Assert.AreEqual(2, recipe.Inputs[0].Quantity);
            Assert.AreEqual("autunite-crystal", recipe.Inputs[1].ResourceId);
            Assert.AreEqual(1, recipe.Inputs[1].Quantity);
        }

        [Test]
        public void IonForgedHullPlateRecipeMatchesTheRealMvpRecipe()
        {
            var recipe = GameContent.IonForgedHullPlateRecipe;
            Assert.AreEqual(2, recipe.Inputs.Count);
            Assert.AreEqual("refined-metal", recipe.Inputs[0].Category);
            Assert.AreEqual(1, recipe.Inputs[0].Quantity);
            Assert.AreEqual(60, recipe.Inputs[0].ThresholdValue);
            Assert.AreEqual("gas", recipe.Inputs[1].Category);
            Assert.AreEqual(1, recipe.Inputs[1].Quantity);
        }
    }
}
