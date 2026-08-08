using System;
using System.IO;
using NUnit.Framework;
using Profitable.Core.Adapters;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Migration Phase 2 Sub-Phase A rewrite (agent-41-unity-galaxy-planet
    // -presentation.md) -- exercises GatherPanel.Gather() directly (the
    // same method a real Button click invokes via onClick), proving the
    // gather -> Inventory wiring is correct. Still not testing formula
    // correctness (that's Agent 40's parity suite's job); this proves
    // wiring plus the one behavior this rewrite actually changes: quality
    // is now fixed per current cycle, not rolled fresh every click.
    //
    // Migration Phase 2 Sub-Phase E addition (agent-61-unity-planet
    // -ownership-presentation.md): TransportColonists test cases.
    // PlanetOwnershipState is injected with a temp-directory-backed
    // FileSaveSystem in SetUp -- these are real persistence-backed tests
    // (not a fake/in-memory double), but must never touch
    // Application.persistentDataPath, the same real file a player's own
    // save data would live in.
    //
    // Retroactive removal (2026-08-04): this file used to also cover
    // ClaimPlanet/BuildCitadel test cases -- both removed along with the
    // whole Citadels sub-system, see planet-ownership.md's own retroactive
    // note. TransportColonists is unaffected.
    public class GatherPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private GatherPanel _panel = null!;
        private string _tempSaveDir = null!;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            PlanetOwnershipState.ResetForTests();
            _tempSaveDir = Path.Combine(Path.GetTempPath(), $"profitable-unity-tests-{Guid.NewGuid():N}");
            PlanetOwnershipState.SetSaveSystem(new FileSaveSystem(_tempSaveDir));
            MarketState.SetWallet(new Wallet { PlayerId = "player-1", Credits = 1_000_000 });

            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _panel = new GatherPanel(_parent.transform, _inventory, _ => { });
        }

        [TearDown]
        public void TearDown()
        {
            UnityEngine.Object.DestroyImmediate(_parent);
            if (Directory.Exists(_tempSaveDir)) Directory.Delete(_tempSaveDir, recursive: true);
        }

        private static void AddDockedShip()
        {
            ShipsState.OwnedShips.Add(new Ship
            {
                Id = "test-ship", Name = "Test Ship", OwnerId = "player-1", Tier = TierColor.White,
                CurrentPlanetId = GalaxyState.StartingPlanet.Id, FuelCapacity = 65, CurrentFuel = 65,
                Components = new ShipComponentSlots(),
            });
        }

        [Test]
        public void GatherAddsOneBatchToInventory()
        {
            _panel.Gather("igneous-ore");
            Assert.AreEqual(1, _inventory.TotalQuantity("igneous-ore"));
        }

        [Test]
        public void GatherProducesValuesInRangeForEveryApplicableQuality()
        {
            var instance = _panel.Gather("igneous-ore");
            foreach (var quality in Qualities.All)
            {
                var value = instance.Qualities[quality];
                Assert.IsTrue(value is >= 1 and <= 100, $"{quality} was {value}");
            }
        }

        [Test]
        public void GatherLeavesInapplicableQualitiesNullNeverZero()
        {
            // Autunite Crystal has no purity (see GameContent's real
            // content, mirroring tests/fixtures/resources.ts). Still
            // guaranteed producible on the starting planet regardless of
            // this galaxy's real roll -- the tutorial guarantee.
            var instance = _panel.Gather("autunite-crystal");
            Assert.IsNull(instance.Qualities[Quality.Purity]);
        }

        [Test]
        public void RepeatedGatherAccumulatesQuantity()
        {
            _panel.Gather("hydrogen-gas");
            _panel.Gather("hydrogen-gas");
            Assert.AreEqual(2, _inventory.TotalQuantity("hydrogen-gas"));
        }

        [Test]
        public void RepeatedGatherProducesIdenticalQuality()
        {
            // The actual behavior this rewrite introduces: quality is
            // fixed per current cycle, read once at panel-construction
            // time, never re-rolled per click.
            var first = _panel.Gather("hydrogen-gas");
            var second = _panel.Gather("hydrogen-gas");
            foreach (var quality in Qualities.All)
            {
                Assert.AreEqual(first.Qualities[quality], second.Qualities[quality]);
            }
        }

        [Test]
        public void TransportColonists_FailsWithoutADockedShip()
        {
            var result = _panel.TransportColonists(5);
            Assert.IsFalse(result.Success);
        }

        [Test]
        public void TransportColonists_SucceedsWithADockedShipAndAccumulatesColonistCount()
        {
            AddDockedShip();
            var before = PlanetOwnershipState.GetEntry(GalaxyState.StartingPlanet.Id).ColonistCount;

            var result = _panel.TransportColonists(5);

            Assert.IsTrue(result.Success);
            Assert.AreEqual(before + 5, PlanetOwnershipState.GetEntry(GalaxyState.StartingPlanet.Id).ColonistCount);
        }

        [Test]
        public void PlanetOwnershipState_PersistsAcrossASimulatedReload()
        {
            AddDockedShip();
            _panel.TransportColonists(5);
            var planetId = GalaxyState.StartingPlanet.Id;
            var entryBeforeReload = PlanetOwnershipState.GetEntry(planetId);

            // Simulate a reload: clear the in-memory cache (but keep the
            // same on-disk save directory) and re-inject a fresh
            // FileSaveSystem pointed at it, the same way a real app
            // restart would re-read from Application.persistentDataPath.
            PlanetOwnershipState.ResetForTests();
            PlanetOwnershipState.SetSaveSystem(new FileSaveSystem(_tempSaveDir));

            var entryAfterReload = PlanetOwnershipState.GetEntry(planetId);
            Assert.AreEqual(entryBeforeReload.ColonistCount, entryAfterReload.ColonistCount);
        }
    }
}
