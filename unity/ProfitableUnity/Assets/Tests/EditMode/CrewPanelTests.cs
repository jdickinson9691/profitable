using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Migration Phase 2 Sub-Phase C (Crew) Presentation --
    // agent-51-unity-crew-presentation.md. Exercises CrewPanel's public
    // trigger methods directly (the same methods a real Button click
    // invokes via onClick), proving the hire/pay-upkeep/dismiss/assign/
    // purchase-capacity -> CrewState/MarketState/Inventory wiring is
    // correct. Not testing formula correctness (that's Agent 50's parity
    // suite's job).
    public class CrewPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private CrewPanel _panel = null!;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            CrewState.ResetForTests();
            // A large starting balance -- the crew pool's tier (and
            // therefore hire cost) is genuinely random per test run
            // (RefreshCrewPool has no fixed seed here), so a small
            // balance could make "successful hire" tests flaky against
            // an unlucky high-tier roll. Formula/curve correctness is
            // Agent 50's parity suite's job, not this wiring test's.
            MarketState.SetWallet(new Wallet { PlayerId = "player-1", Credits = 1_000_000 });

            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _panel = new CrewPanel(_parent.transform, _inventory, _ => { });
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        private static string FirstPoolCandidateId() =>
            CrewState.GetOrRefreshPool(System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()).AvailableHires[0].Id;

        [Test]
        public void Hire_AddsToRosterAndDeductsWallet()
        {
            var candidateId = FirstPoolCandidateId();
            var creditsBefore = MarketState.Wallet.Credits;

            var result = _panel.Hire(candidateId);

            Assert.IsTrue(result.Hired);
            Assert.AreEqual(1, CrewState.Crew.Count);
            Assert.Less(MarketState.Wallet.Credits, creditsBefore);
        }

        [Test]
        public void Hire_FailsForUnknownCandidateId()
        {
            var result = _panel.Hire("no-such-candidate");

            Assert.IsFalse(result.Hired);
            Assert.IsEmpty(CrewState.Crew);
        }

        [Test]
        public void Dismiss_RemovesFromRoster()
        {
            var candidateId = FirstPoolCandidateId();
            _panel.Hire(candidateId);
            Assert.AreEqual(1, CrewState.Crew.Count);

            var result = _panel.Dismiss(candidateId);

            Assert.IsTrue(result.Dismissed);
            Assert.IsEmpty(CrewState.Crew);
        }

        [Test]
        public void PayCrewUpkeep_NotDueImmediatelyAfterHire()
        {
            var candidateId = FirstPoolCandidateId();
            _panel.Hire(candidateId);

            var result = _panel.PayCrewUpkeep(candidateId);

            Assert.AreEqual("not-due", result.Status);
        }

        [Test]
        public void AssignToCraft_ConsumesInventoryAndActivatesTheCrewMember()
        {
            var candidateId = FirstPoolCandidateId();
            _panel.Hire(candidateId);

            _inventory.Add(new ResourceInstance
            {
                Resource = GameContent.RadiantAlloyBar,
                Quantity = 1,
                Qualities = new QualityMap { [Quality.Purity] = 60, [Quality.Density] = 60, [Quality.Potency] = 60, [Quality.Durability] = 60, [Quality.Rarity] = 60 },
            });
            _inventory.Add(new ResourceInstance
            {
                Resource = GameContent.HydrogenGas,
                Quantity = 1,
                Qualities = new QualityMap { [Quality.Purity] = 60, [Quality.Density] = 60, [Quality.Potency] = 60, [Quality.Rarity] = 60 },
            });

            var result = _panel.AssignToCraft(candidateId);

            Assert.IsTrue(result.Assigned);
            Assert.AreEqual(0, _inventory.TotalQuantity(GameContent.RadiantAlloyBar.Id));
            Assert.AreEqual(0, _inventory.TotalQuantity(GameContent.HydrogenGas.Id));
            Assert.AreEqual(CrewStatus.Active, CrewState.Crew.Single(m => m.Id == candidateId).Status);
        }

        [Test]
        public void AssignToCraft_FailsCleanlyWhenMaterialsAreMissing()
        {
            var candidateId = FirstPoolCandidateId();
            _panel.Hire(candidateId);

            var result = _panel.AssignToCraft(candidateId);

            Assert.IsFalse(result.Assigned);
            Assert.AreEqual(CrewStatus.Idle, CrewState.Crew.Single(m => m.Id == candidateId).Status);
        }

        [Test]
        public void PurchaseCapacity_IncreasesCapacityAndDeductsWallet()
        {
            var creditsBefore = MarketState.Wallet.Credits;

            var result = _panel.PurchaseCapacity();

            Assert.IsTrue(result.Purchased);
            Assert.AreEqual(1, CrewState.Capacity.PurchasedSlots);
            Assert.Less(MarketState.Wallet.Credits, creditsBefore);
        }
    }
}
