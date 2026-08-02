using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;

namespace Profitable.Unity.Tests.EditMode
{
    // Agent 36 (Unity Migration Phase 1 Integration) --
    // docs/agents/agent-36-unity-migration-phase1-integration.md.
    //
    // Mirrors tests/integration/mvpLoop.test.ts's exact scenario -- same
    // real content, same hand-calculated inputs/tiers/random sequences,
    // same expected values -- with Refiner.Refine's actual output object
    // chained directly into Crafter.Craft's input, proving the C# port
    // agrees with the already-proven-correct TypeScript values *and*
    // that nothing is lost or corrupted in the refine-to-craft data flow.
    public class IntegrationTests
    {
        [SetUp]
        public void SetUp() => GameContent.ResetForTests();

        [Test]
        public void GddDodStep1_AResourceCanBeGatheredOnDeltaRigelusWithARandomQualityRoll()
        {
            var planet = GameContent.StartingPlanet;
            Assert.AreEqual("delta-rigelus", planet.Id);

            foreach (var resourceId in planet.ProducibleResourceIds)
            {
                var resource = GameContent.Loaded.Resources.Single(r => r.Id == resourceId);
                var roll = QualityRoller.RollQuality(resource);

                foreach (var quality in Qualities.All)
                {
                    var applicable = resource.ApplicableQualities.TryGetValue(quality, out var a) && a;
                    var value = roll[quality];
                    if (applicable)
                    {
                        Assert.IsTrue(value is >= 1 and <= 100, $"{resourceId}.{quality} was {value}");
                    }
                    else
                    {
                        Assert.IsNull(value, $"{resourceId}.{quality} should be null (not applicable)");
                    }
                }
            }
        }

        private static QualityMap Uniform(int value, bool includeDurability = true)
        {
            var map = new QualityMap
            {
                [Quality.Purity] = value,
                [Quality.Density] = value,
                [Quality.Potency] = value,
                [Quality.Durability] = includeDurability ? value : (int?)null,
                [Quality.Rarity] = value,
            };
            return map;
        }

        [Test]
        public void GddDodStep2_RefineOnTheRealRefiningRecipeMatchesTheHandCalculatedValue()
        {
            var refiningRecipe = GameContent.RadiantAlloyBarRecipe;
            var igneousOre = GameContent.IgneousOre;
            var autuniteCrystal = GameContent.AutuniteCrystal;

            // Both inputs at a uniform 60 on every applicable dimension --
            // base_avg is 60 on all 5 dims (purity comes solely from the
            // ore, since the crystal's purity is null in the real
            // content; still 60).
            var oreQualities = Uniform(60);
            var crystalQualities = Uniform(60);
            crystalQualities[Quality.Purity] = null; // Autunite Crystal has no purity

            var inputs = new[]
            {
                new ResourceInstance { Resource = igneousOre, Quantity = 2, Qualities = oreQualities },
                new ResourceInstance { Resource = autuniteCrystal, Quantity = 1, Qualities = crystalQualities },
            };
            Assert.AreEqual(refiningRecipe.Inputs[0].Quantity, inputs[0].Quantity);
            Assert.AreEqual(refiningRecipe.Inputs[1].Quantity, inputs[1].Quantity);

            // Gold refiner tier: -0.5%/+15%. random()=0 -> varianceRoll =
            // -0.005 exactly -> round(60 * 0.995) = round(59.7) = 60 on
            // every dimension. Output average = 60 -> White tier (41-60)
            // -> 0% refund chance, so the 3 remaining queued values (one
            // per consumed unit: 2 ore + 1 crystal) never matter.
            var random = TestFixtureRandom(0, 0.5, 0.5, 0.5);
            var result = Refiner.Refine(inputs, TierColor.Gold, random);

            Assert.AreEqual(TierColor.White, result.OutputTier);
            Assert.AreEqual(0, result.RefundUnits);
            foreach (var quality in Qualities.All)
            {
                Assert.AreEqual(60, result.Qualities[quality], $"{quality}");
            }
        }

        [Test]
        public void GddDodStep3_RefinedOutputChainsIntoCraftAndMatchesTheHandCalculatedValue()
        {
            // Reproduce step 2's exact refine deterministically, then feed
            // its ACTUAL RefineResult (not a hand-typed copy) into craft()
            // -- this is the real end-to-end chain, not two independently
            // -asserted halves.
            var refiningRecipe = GameContent.RadiantAlloyBarRecipe;
            var oreQualities = Uniform(60);
            var crystalQualities = Uniform(60);
            crystalQualities[Quality.Purity] = null;
            var refineInputs = new[]
            {
                new ResourceInstance { Resource = GameContent.IgneousOre, Quantity = 2, Qualities = oreQualities },
                new ResourceInstance { Resource = GameContent.AutuniteCrystal, Quantity = 1, Qualities = crystalQualities },
            };
            var refineResult = Refiner.Refine(refineInputs, TierColor.Gold, TestFixtureRandom(0, 0.5, 0.5, 0.5));

            var recipe = GameContent.IonForgedHullPlateRecipe;
            var schematic = GameContent.Loaded.Schematics.Single(s => s.RecipeId == recipe.Id);
            Assert.AreEqual(TierColor.Blue, schematic.Tier); // the real content's actual choice, not assumed

            // The recipe's own threshold (60) must exactly match step 2's
            // refined durability (60) for this scenario to be meaningful
            // -- spelled out explicitly, not a coincidence relied on
            // silently.
            Assert.AreEqual(60, recipe.Inputs[0].ThresholdValue);
            Assert.AreEqual(60, refineResult.Qualities[Quality.Durability]);

            var alloyBarInstance = new ResourceInstance
            {
                Resource = GameContent.RadiantAlloyBar,
                Quantity = refiningRecipe.OutputQuantity,
                Qualities = refineResult.Qualities, // the actual chained output
            };
            var gasInstance = new ResourceInstance
            {
                Resource = GameContent.HydrogenGas,
                Quantity = 1,
                Qualities = Uniform(60, includeDurability: false),
            };

            // Gold crafter (+15%) + Blue schematic (+3%) = +18% ceiling
            // (exactly at the cap, not over it) -> raisedCeiling = 60 *
            // 1.18 = 70.8 on every dimension. Gold's -0.5% downside
            // widened by Blue's 1.5% narrowing floors to exactly 0 -> the
            // roll is deterministic regardless of the random() value.
            // Durability 60 meets the recipe's 60 threshold exactly (0
            // points below) -> multiplier 1.0 regardless of Blue's
            // forgiveness. round(70.8) = 71 on every dimension.
            var craftResult = Crafter.Craft(
                new[] { alloyBarInstance, gasInstance }, recipe, schematic.Tier, TierColor.Gold, TestFixtureRandom(0.5));

            Assert.IsInstanceOf<CraftAccepted>(craftResult);
            var accepted = (CraftAccepted)craftResult;
            foreach (var quality in Qualities.All)
            {
                Assert.AreEqual(71, accepted.Qualities[quality], $"{quality}");
            }
        }

        private static RandomFn TestFixtureRandom(params double[] values)
        {
            var index = 0;
            return () =>
            {
                if (index >= values.Length)
                {
                    throw new System.InvalidOperationException($"TestFixtureRandom exhausted after {values.Length} calls");
                }
                return values[index++];
            };
        }
    }
}
