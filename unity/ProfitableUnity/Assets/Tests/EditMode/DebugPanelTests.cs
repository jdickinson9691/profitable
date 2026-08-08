using System.Linq;
using NUnit.Framework;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Unity.UI;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.Tests.EditMode
{
    // Part 3/Part 1 real-click verification for DebugPanel.cs, same
    // standard the TypeScript panel's own click-through verification
    // used: find the real Button GameObject the panel constructed
    // (Button_{label}, same convention ShipCrewRolesPanelClickThroughTest
    // .cs's own Click() helper relies on), invoke its real onClick, then
    // read the real underlying Constants property/Dictionary directly
    // (not the panel's own displayed text) to prove the click reached
    // the genuine constant, not just local UI state.
    //
    // Covers a representative row from every tuning section -- the 16
    // tunables newly added to debugTuningRegistry.ts's TS counterpart
    // (Fuel/Cargo/all 5 Ship Crew Role tables/Planet & Colonists), plus
    // one row each from every section that already existed in TS's
    // original 5-section scope (Trading/Crew/Scanner/Travel Encounters/
    // Combat) -- not full row-by-row/tier-by-tier coverage (256+ rows),
    // which would just be re-asserting BuildSections()' own declarative
    // wiring rather than proving anything about the real click path.
    public class DebugPanelTests
    {
        private GameObject _parent = null!;
        private DebugPanel _panel = null!;

        [SetUp]
        public void SetUp()
        {
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _panel = new DebugPanel(_parent.transform, _ => { });
        }

        [TearDown]
        public void TearDown()
        {
            // These tests mutate real, static, process-lifetime Constants
            // properties/Dictionaries -- restore everything back to what
            // it was at SetUp (this panel's own captured DEFAULT_SNAPSHOT)
            // so no static tuning state leaks into an unrelated test
            // class sharing this same Unity batch-mode test run.
            _panel.ResetAllToDefaults();
            Object.DestroyImmediate(_parent);
        }

        private static Button FindButton(GameObject root, string label)
        {
            var name = $"Button_{label}";
            var button = root.GetComponentsInChildren<Button>(includeInactive: true)
                .FirstOrDefault(b => b.gameObject.name == name);
            Assert.IsNotNull(button, $"no button named '{name}' was found under the panel");
            return button!;
        }

        [Test]
        public void PlusButton_MutatesRealFuelCapacityConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.FuelCapacityByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Fuel capacity — Grey").onClick.Invoke();
            Assert.AreEqual(before + 5, ShipsAndTravelConfig.FuelCapacityByTier[TierColor.Grey]);
        }

        [Test]
        public void PlusButton_MutatesRealCargoHoldCapacityConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.CargoHoldCapacityByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Cargo hold capacity — Grey").onClick.Invoke();
            Assert.AreEqual(before + 1, ShipsAndTravelConfig.CargoHoldCapacityByTier[TierColor.Grey]);
        }

        [Test]
        public void MinusButton_MutatesRealFuelCostPerDistanceUnitConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.FuelCostPerDistanceUnit;
            FindButton(_panel.Root, "- Fuel cost / distance unit").onClick.Invoke();
            Assert.AreEqual(before - 0.005, ShipsAndTravelConfig.FuelCostPerDistanceUnit, 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealRefuelCostPerUnitConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.RefuelCostPerUnit;
            FindButton(_panel.Root, "+ Refuel cost / unit").onClick.Invoke();
            Assert.AreEqual(before + 0.5, ShipsAndTravelConfig.RefuelCostPerUnit, 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealRepairElapsedTimeCapConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.RepairElapsedTimeCapHours;
            FindButton(_panel.Root, "+ Repair elapsed-time cap (h)").onClick.Invoke();
            Assert.AreEqual(before + 1, ShipsAndTravelConfig.RepairElapsedTimeCapHours, 0.0001);
        }

        // CrewSlotsByTier's whole-entry read-patch-write path
        // (CrewSlotRows()) -- proves clicking one field's stepper leaves
        // the other 3 fields of the same tier's entry untouched.
        [Test]
        public void PlusButton_MutatesOnlyThePilotFieldOfCrewSlotsByTierEntry_TS_Part1()
        {
            var before = ShipsAndTravelConfig.CrewSlotsByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Crew slots — Pilot — Grey").onClick.Invoke();
            var after = ShipsAndTravelConfig.CrewSlotsByTier[TierColor.Grey];
            Assert.AreEqual(before.Pilot + 1, after.Pilot);
            Assert.AreEqual(before.CombatEngineerOrScienceOfficer, after.CombatEngineerOrScienceOfficer);
            Assert.AreEqual(before.SystemsEngineer, after.SystemsEngineer);
            Assert.AreEqual(before.Crafter, after.Crafter);
        }

        [Test]
        public void PlusButton_MutatesRealPilotSpeedBonusConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.PilotSpeedBonusByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Pilot speed multiplier — Grey").onClick.Invoke();
            Assert.AreEqual(before + 0.01, ShipsAndTravelConfig.PilotSpeedBonusByTier[TierColor.Grey], 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealCombatEngineerMitigationConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.CombatEngineerMitigationByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Combat Engineer mitigation % — Grey").onClick.Invoke();
            Assert.AreEqual(before + 0.05, ShipsAndTravelConfig.CombatEngineerMitigationByTier[TierColor.Grey], 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealScienceOfficerRadiusBonusConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.ScienceOfficerRadiusBonusByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Science Officer radius bonus — Grey").onClick.Invoke();
            Assert.AreEqual(before + 5, ShipsAndTravelConfig.ScienceOfficerRadiusBonusByTier[TierColor.Grey], 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealArtisanMaterialDiscountConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.ArtisanMaterialDiscountByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Artisan material discount % — Grey").onClick.Invoke();
            Assert.AreEqual(before + 0.05, ShipsAndTravelConfig.ArtisanMaterialDiscountByTier[TierColor.Grey], 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealSystemsEngineerRepairRateConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.SystemsEngineerRepairRateByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Systems Engineer repair rate/h — Grey").onClick.Invoke();
            Assert.AreEqual(before + 0.25, ShipsAndTravelConfig.SystemsEngineerRepairRateByTier[TierColor.Grey], 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealCrafterRepairRateConstant_TS_Part1()
        {
            var before = ShipsAndTravelConfig.CrafterRepairRateByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Crafter repair rate/h — Grey").onClick.Invoke();
            Assert.AreEqual(before + 0.25, ShipsAndTravelConfig.CrafterRepairRateByTier[TierColor.Grey], 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealColonistTransportCostConstant_TS_Part1()
        {
            var before = PlanetOwnershipConstants.ColonistTransportCost;
            FindButton(_panel.Root, "+ Colonist transport cost").onClick.Invoke();
            Assert.AreEqual(before + 5, PlanetOwnershipConstants.ColonistTransportCost, 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealMinimumColonistsToProduceConstant_TS_Part1_Part2()
        {
            var before = PlanetOwnershipConstants.MinimumColonistsToProduce;
            FindButton(_panel.Root, "+ Minimum colonists to produce").onClick.Invoke();
            Assert.AreEqual(before + 1, PlanetOwnershipConstants.MinimumColonistsToProduce);
        }

        [Test]
        public void PlusButton_MutatesRealPlanetResourceResetIntervalConstant_TS_Part1_Part2()
        {
            var before = PlanetResourceCycleConstants.PlanetResourceResetIntervalHours;
            FindButton(_panel.Root, "+ Planet resource reset interval (h)").onClick.Invoke();
            Assert.AreEqual(before + 12, PlanetResourceCycleConstants.PlanetResourceResetIntervalHours);
        }

        [Test]
        public void PlusButton_MutatesRealResourceQuantityCapConstant_TS_Part1()
        {
            var before = ResourceQuantityCapTable.ByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Resource quantity cap / cycle — Grey").onClick.Invoke();
            Assert.AreEqual(before + 5, ResourceQuantityCapTable.ByTier[TierColor.Grey]);
        }

        // Representative rows from every section that already existed in
        // TS's original 5-section scope (Part 3's "everything already
        // exposed" requirement), proving the panel is a complete port,
        // not just Part 1's additions.
        [Test]
        public void PlusButton_MutatesRealListingExpiryHoursConstant_TradingSection()
        {
            var before = TradingConfig.ListingExpiryHours;
            FindButton(_panel.Root, "+ Listing expiry (h)").onClick.Invoke();
            Assert.AreEqual(before + 1, TradingConfig.ListingExpiryHours, 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealBaseCrewCapacityConstant_CrewSection()
        {
            var before = CrewConfig.BaseCrewCapacity;
            FindButton(_panel.Root, "+ Base crew capacity").onClick.Invoke();
            Assert.AreEqual(before + 1, CrewConfig.BaseCrewCapacity);
        }

        [Test]
        public void PlusButton_MutatesRealScannerBaseScanRadiusConstant_ScannerSection()
        {
            var before = ShipsAndTravelConfig.ScannerBaseScanRadius;
            FindButton(_panel.Root, "+ Scanner base radius").onClick.Invoke();
            Assert.AreEqual(before + 10, ShipsAndTravelConfig.ScannerBaseScanRadius, 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealEncounterTriggerChanceConstant_TravelEncountersSection()
        {
            var before = ShipsAndTravelConfig.EncounterTriggerChance;
            FindButton(_panel.Root, "+ Encounter trigger chance").onClick.Invoke();
            Assert.AreEqual(before + 0.01, ShipsAndTravelConfig.EncounterTriggerChance, 0.0001);
        }

        [Test]
        public void PlusButton_MutatesRealArrivalCombatCheckChanceConstant_CombatSection()
        {
            var before = ShipsAndTravelConfig.ArrivalCombatCheckChance;
            FindButton(_panel.Root, "+ Arrival combat check chance").onClick.Invoke();
            Assert.AreEqual(before + 0.01, ShipsAndTravelConfig.ArrivalCombatCheckChance, 0.0001);
        }

        [Test]
        public void ResetAllToDefaults_RestoresValueChangedByARealClick()
        {
            var original = ShipsAndTravelConfig.FuelCapacityByTier[TierColor.Grey];
            FindButton(_panel.Root, "+ Fuel capacity — Grey").onClick.Invoke();
            Assert.AreNotEqual(original, ShipsAndTravelConfig.FuelCapacityByTier[TierColor.Grey]);

            FindButton(_panel.Root, "Reset all tuning to alpha defaults").onClick.Invoke();

            Assert.AreEqual(original, ShipsAndTravelConfig.FuelCapacityByTier[TierColor.Grey]);
        }
    }
}
