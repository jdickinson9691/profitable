using NUnit.Framework;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Unity.DebugTools;

namespace Profitable.Unity.Tests.EditMode
{
    // Part 4. Ports debugForcedRandom.ts's own buildForcedEncounterRandom()
    // contract exactly: call 1 always passes the trigger-chance check
    // (returns 0), call 2 lands inside the requested type's own slice of
    // the real ShipsAndTravelConfig.EncounterTypeWeights cumulative range
    // (at its midpoint), and every call after that falls through to real
    // randomness (asserted here only as "not fixed to a forced value,"
    // since it's genuinely non-deterministic by design).
    public class ForcedEncounterRandomTests
    {
        [Test]
        public void FirstCall_AlwaysReturnsZero_TriggerChanceCheckAlwaysPasses()
        {
            var random = ForcedEncounterRandom.Build(EncounterType.Combat);
            Assert.AreEqual(0, random());
        }

        [Test]
        public void SecondCall_LandsAtTheMidpointOfTradeOpportunitysCumulativeSlice()
        {
            // TradeOpportunity is first in EncounterTypeOrder, so its
            // slice starts at cumulative 0 -- midpoint is weight/2.
            var random = ForcedEncounterRandom.Build(EncounterType.TradeOpportunity);
            random(); // call 1, discarded
            var second = random();

            var expected = ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.TradeOpportunity] / 2;
            Assert.AreEqual(expected, second, 0.0001);
        }

        [Test]
        public void SecondCall_LandsAtTheMidpointOfCombatsCumulativeSlice_LastInOrder()
        {
            var weights = ShipsAndTravelConfig.EncounterTypeWeights;
            var cumulativeBeforeCombat =
                weights[EncounterType.TradeOpportunity] + weights[EncounterType.Discovery] + weights[EncounterType.Hazard];
            var expected = cumulativeBeforeCombat + weights[EncounterType.Combat] / 2;

            var random = ForcedEncounterRandom.Build(EncounterType.Combat);
            random(); // call 1, discarded
            var second = random();

            Assert.AreEqual(expected, second, 0.0001);
        }

        [Test]
        public void EveryCallAfterTheSecond_IsNotPinnedToAForcedValue()
        {
            // Not a statistical proof (that's ResolveEncounters' own
            // formula-level test suite's job) -- just proves this
            // function stops intercepting after call 2, matching the
            // TypeScript source's own `return Math.random()` fallthrough.
            // Two consecutive builds landing on the exact same 3rd-call
            // double by coincidence is a (1 / 2^53)-order event.
            var randomA = ForcedEncounterRandom.Build(EncounterType.Hazard);
            randomA(); randomA();
            var thirdA = randomA();

            var randomB = ForcedEncounterRandom.Build(EncounterType.Hazard);
            randomB(); randomB();
            var thirdB = randomB();

            Assert.AreNotEqual(thirdA, thirdB);
        }
    }
}
