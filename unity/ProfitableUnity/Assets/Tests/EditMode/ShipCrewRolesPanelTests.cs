using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Ports ShipStatusScene.ts's crew-role assign/unassign flow (see
    // ShipCrewRolesPanel.cs's own doc comment) -- exercises
    // OnAssignRole()/OnUnassignRole() directly, the same "public entry
    // point exercised directly" convention every other panel's tests
    // already establish. Two things this file specifically proves, since
    // they're the real point of this panel, not incidental: assigning a
    // Systems Engineer/Crafter genuinely fixes the documented
    // ComponentRepairResolver no-op regression (previously no crew member
    // could ever hold a ShipRole in this Unity build at all), and
    // assigning a Pilot/Science Officer genuinely has zero effect on the
    // real travel/scan call sites -- the disconnection is preserved, not
    // silently wired up.
    public class ShipCrewRolesPanelTests
    {
        private GameObject _parent = null!;
        private ShipCrewRolesPanel _panel = null!;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _panel = new ShipCrewRolesPanel(_parent.transform, _ => { });
        }

        [TearDown]
        public void TearDown() => UnityEngine.Object.DestroyImmediate(_parent);

        // ShipTierDeriver.DeriveShipTier() derives a ship's real tier from
        // its installed components' own tiers (averaged), never from a
        // raw Ship.Tier field set directly -- an empty ShipComponentSlots
        // always derives Grey regardless of what Tier is set to (the "no
        // components -> Grey" rule). GetCrewSlotsForShip() reads that
        // derived tier, so a test that needs a specific slot allocation
        // must install real components at the target tier, not just set
        // Tier and hope.
        private static ShipComponent BuildComponent(ComponentCategory category, TierColor tier)
        {
            var qualities = new QualityMap();
            foreach (var quality in Qualities.All) qualities[quality] = 70;
            return new ShipComponent { Id = $"{category}-{tier}", Category = category, Qualities = qualities, Tier = tier };
        }

        private static Ship AddShip(string id = "test-ship", TierColor tier = TierColor.Grey)
        {
            var components = new ShipComponentSlots
            {
                Weapon = BuildComponent(ComponentCategory.Weapon, tier),
                Engine = BuildComponent(ComponentCategory.Engine, tier),
                Shield = BuildComponent(ComponentCategory.Shield, tier),
                CargoHold = BuildComponent(ComponentCategory.CargoHold, tier),
            };
            var ship = new Ship
            {
                Id = id, Name = "Test Ship", OwnerId = "player-1", Tier = tier,
                CurrentPlanetId = GalaxyState.StartingPlanet.Id, FuelCapacity = 100_000, CurrentFuel = 100_000,
                Components = components,
            };
            ShipsState.OwnedShips.Add(ship);
            return ship;
        }

        private static CrewMember AddCrewMember(string id, TierColor tier = TierColor.Grey, string? profession = null)
        {
            var member = new CrewMember
            {
                Id = id, HiredByPlayerId = "player-1", Tier = tier, Profession = profession,
                Status = CrewStatus.Idle, HiredAt = 0, LastCheckedAt = 0, WageAmount = 1, LastPaidAt = 0,
            };
            CrewState.Crew.Add(member);
            return member;
        }

        [Test]
        public void OnAssignRole_FailsForUnknownShipOrCrewMember()
        {
            var result = _panel.OnAssignRole("no-ship", "no-member", ShipCrewRole.Pilot);
            Assert.IsNull(result);
        }

        [Test]
        public void OnAssignRole_SucceedsAndSetsShipRoleAndAssignedShipId()
        {
            var ship = AddShip();
            AddCrewMember("crew-1");

            var result = _panel.OnAssignRole(ship.Id, "crew-1", ShipCrewRole.Pilot);

            Assert.IsInstanceOf<AssignShipRoleSucceeded>(result);
            var member = CrewState.Crew.Single(m => m.Id == "crew-1");
            Assert.AreEqual(ShipCrewRole.Pilot, member.ShipRole);
            Assert.AreEqual(ship.Id, member.AssignedShipId);
        }

        [Test]
        public void OnAssignRole_RejectsCrafterForCrewWithNoProfession()
        {
            var ship = AddShip();
            AddCrewMember("crew-1", profession: null);

            var result = _panel.OnAssignRole(ship.Id, "crew-1", ShipCrewRole.Crafter);

            Assert.IsInstanceOf<AssignShipRoleRejected>(result);
            Assert.IsNull(CrewState.Crew.Single(m => m.Id == "crew-1").ShipRole);
        }

        [Test]
        public void OnAssignRole_SucceedsForCrafterWhenProfessionIsSet()
        {
            var ship = AddShip();
            AddCrewMember("crew-1", profession: "Weaponsmith");

            var result = _panel.OnAssignRole(ship.Id, "crew-1", ShipCrewRole.Crafter);

            Assert.IsInstanceOf<AssignShipRoleSucceeded>(result);
        }

        [Test]
        public void OnAssignRole_RejectsWhenTheRoleSlotIsAlreadyFull()
        {
            // Grey tier: Pilot capacity is exactly 1 (ShipsAndTravelConfig
            // .CrewSlotsByTier).
            var ship = AddShip(tier: TierColor.Grey);
            AddCrewMember("crew-1");
            AddCrewMember("crew-2");
            _panel.OnAssignRole(ship.Id, "crew-1", ShipCrewRole.Pilot);

            var result = _panel.OnAssignRole(ship.Id, "crew-2", ShipCrewRole.Pilot);

            Assert.IsInstanceOf<AssignShipRoleRejected>(result);
        }

        [Test]
        public void CombatEngineerAndScienceOfficer_ShareASingleCombinedPoolNotTwoIndependentCaps()
        {
            // Blue tier: CombatEngineerOrScienceOfficer capacity is
            // exactly 2, shared between both roles.
            var ship = AddShip(tier: TierColor.Blue);
            AddCrewMember("crew-1");
            AddCrewMember("crew-2");
            AddCrewMember("crew-3");
            Assert.IsInstanceOf<AssignShipRoleSucceeded>(_panel.OnAssignRole(ship.Id, "crew-1", ShipCrewRole.CombatEngineer));
            Assert.IsInstanceOf<AssignShipRoleSucceeded>(_panel.OnAssignRole(ship.Id, "crew-2", ShipCrewRole.ScienceOfficer));

            var result = _panel.OnAssignRole(ship.Id, "crew-3", ShipCrewRole.CombatEngineer);

            Assert.IsInstanceOf<AssignShipRoleRejected>(result, "the combined pool should already be full (1 Combat Engineer + 1 Science Officer = 2/2)");
        }

        [Test]
        public void OnAssignRole_ReassigningClearsThePreviousRole()
        {
            var ship = AddShip();
            AddCrewMember("crew-1");
            _panel.OnAssignRole(ship.Id, "crew-1", ShipCrewRole.Pilot);

            _panel.OnAssignRole(ship.Id, "crew-1", ShipCrewRole.SystemsEngineer);

            var member = CrewState.Crew.Single(m => m.Id == "crew-1");
            Assert.AreEqual(ShipCrewRole.SystemsEngineer, member.ShipRole);
            // Grey-tier Pilot slot (1/1) is now free again -- a second
            // crew member can take it, proving the reassignment genuinely
            // vacated the old role rather than double-booking it.
            AddCrewMember("crew-2");
            Assert.IsInstanceOf<AssignShipRoleSucceeded>(_panel.OnAssignRole(ship.Id, "crew-2", ShipCrewRole.Pilot));
        }

        [Test]
        public void OnUnassignRole_ClearsShipRoleAndAssignedShipId()
        {
            var ship = AddShip();
            AddCrewMember("crew-1");
            _panel.OnAssignRole(ship.Id, "crew-1", ShipCrewRole.Pilot);

            var result = _panel.OnUnassignRole("crew-1");

            Assert.IsInstanceOf<UnassignShipRoleSucceeded>(result);
            var member = CrewState.Crew.Single(m => m.Id == "crew-1");
            Assert.IsNull(member.ShipRole);
            Assert.IsNull(member.AssignedShipId);
        }

        [Test]
        public void OnUnassignRole_FailsWhenNotCurrentlyAssigned()
        {
            AddCrewMember("crew-1");
            var result = _panel.OnUnassignRole("crew-1");
            Assert.IsInstanceOf<UnassignShipRoleRejected>(result);
        }

        // --- The real repair-regression fix ---

        private static Ship WithDamagedWeapon(Ship ship, int durability)
        {
            var qualities = new QualityMap();
            foreach (var quality in Qualities.All) qualities[quality] = 70;
            qualities[Quality.Durability] = durability;
            var damaged = new ShipComponentSlots
            {
                Weapon = new ShipComponent { Id = "weapon-1", Category = ComponentCategory.Weapon, Qualities = qualities, Tier = TierColor.Grey },
            };
            var updated = new Ship
            {
                Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier, CurrentPlanetId = ship.CurrentPlanetId,
                FuelCapacity = ship.FuelCapacity, CurrentFuel = ship.CurrentFuel, Components = damaged, LastRepairedAt = 0,
            };
            ShipsState.ReplaceShip(updated);
            return updated;
        }

        [Test]
        public void BeforeAssignment_ResolveComponentRepairRestoresZeroDurability_TheDocumentedNoOp()
        {
            var ship = AddShip();
            ship = WithDamagedWeapon(ship, durability: 50);

            // Same call ShipsPanel.CheckRepair() itself makes: real
            // CrewState.Crew, no active voyage, a real elapsed window.
            var repaired = ComponentRepairResolver.ResolveComponentRepair(ship, CrewState.Crew, null, 10 * 60 * 60 * 1000);

            Assert.AreEqual(50, repaired.Components.Weapon!.Qualities[Quality.Durability],
                "with no crew ever able to hold a ShipRole, repair must still be a real no-op -- confirms the regression this panel fixes was real, not assumed");
        }

        [Test]
        public void AfterAssigningASystemsEngineer_ResolveComponentRepairRestoresRealDurability()
        {
            var ship = AddShip();
            ship = WithDamagedWeapon(ship, durability: 50);
            AddCrewMember("engineer-1", tier: TierColor.Gold);
            _panel.OnAssignRole(ship.Id, "engineer-1", ShipCrewRole.SystemsEngineer);
            ship = ShipsState.OwnedShips.Single(s => s.Id == ship.Id);

            // Exactly ShipsPanel.CheckRepair()'s own real call.
            var repaired = ComponentRepairResolver.ResolveComponentRepair(ship, CrewState.Crew, null, 10 * 60 * 60 * 1000);

            Assert.Greater(repaired.Components.Weapon!.Qualities[Quality.Durability], 50,
                "a real assigned Systems Engineer must now produce real, non-zero repair through the same unchanged CheckRepair() call site");
        }

        [Test]
        public void AfterAssigningAMatchingCrafter_ResolveComponentRepairRestoresRealDurabilityWhileTraveling()
        {
            var ship = AddShip();
            ship = WithDamagedWeapon(ship, durability: 50);
            AddCrewMember("crafter-1", tier: TierColor.Gold, profession: "Weaponsmith");
            _panel.OnAssignRole(ship.Id, "crafter-1", ShipCrewRole.Crafter);
            ship = ShipsState.OwnedShips.Single(s => s.Id == ship.Id);
            var activeVoyage = new Voyage { Id = "v1", ShipId = ship.Id, OriginPlanetId = "a", DestinationPlanetId = "b", DepartedAt = 0, ArrivesAt = 999_999_999 };

            var repaired = ComponentRepairResolver.ResolveComponentRepair(ship, CrewState.Crew, activeVoyage, 10 * 60 * 60 * 1000);

            Assert.Greater(repaired.Components.Weapon!.Qualities[Quality.Durability], 50,
                "a real assigned, category-matching Crafter must repair while traveling, through the same unchanged CheckRepair()-shaped call");
        }

        // --- Combat Engineer: reachability through the real ownedCrew list ---

        [Test]
        public void AssigningACombatEngineer_MakesThemReachableInTheSameRealCrewListResolveCombatChoiceReads()
        {
            // ResolveCombatChoice()'s own mitigation math is Core's own
            // parity-tested job (ShipsTravelParityTests.cs) -- this proves
            // the presentation-layer half: a Combat-Engineer-assigned
            // crew member is now findable in CrewState.Crew, the exact
            // real list ShipsPanel.ResolveCombat() already passes to
            // CombatChoiceResolver.ResolveCombatChoice() unchanged.
            var ship = AddShip();
            AddCrewMember("engineer-1");
            _panel.OnAssignRole(ship.Id, "engineer-1", ShipCrewRole.CombatEngineer);

            var found = CrewState.Crew.FirstOrDefault(m => m.AssignedShipId == ship.Id && m.ShipRole == ShipCrewRole.CombatEngineer);

            Assert.IsNotNull(found);
        }

        // --- Pilot / Science Officer: the faithfully-preserved disconnection ---

        [Test]
        public void AssigningAPilot_HasZeroEffectOnTheRealInitiateVoyageCallSite()
        {
            var ship = AddShip();
            var origin = GalaxyState.StartingPlanet;
            var destination = GalaxyState.SecondaryDestinationPlanet;

            AddCrewMember("pilot-1", tier: TierColor.Gold); // Gold has the largest real Pilot bonus
            _panel.OnAssignRole(ship.Id, "pilot-1", ShipCrewRole.Pilot);
            ship = ShipsState.OwnedShips.Single(s => s.Id == ship.Id);

            // Exactly ShipsPanel.InitiateVoyageTo()'s own real call:
            // VoyageInitiator.InitiateVoyage(ship, origin, destination,
            // cargo, now, id) -- 6 positional arguments, no pilot, even
            // though a real, assigned Gold-tier Pilot exists on this ship.
            const long departedAt = 1_000_000;
            var result = VoyageInitiator.InitiateVoyage(ship, origin, destination, new List<VoyageCargoItem>(), departedAt, "voyage-1");
            var actualDuration = result.Voyage.ArrivesAt - departedAt;

            var noPilotDuration = TravelTimeCalculator.CalculateTravelTime(origin, destination, ship);

            Assert.AreEqual(noPilotDuration, actualDuration, 0.0001,
                "the real voyage's duration must exactly match the no-pilot calculation -- proving the assigned Pilot's real, working speed bonus never reaches the real call site, the same disconnection TradeMapScene.ts's own real initiateVoyage() call has");
        }

        [Test]
        public void AssigningAScienceOfficer_HasZeroEffectOnTheRealPerformScanCallSite()
        {
            var ship = AddShip();
            var dockedPlanet = GalaxyState.StartingPlanet;
            // Grey tier (zero scanner radius bonus of its own) --
            // deliberately leaves the most real headroom for a Science
            // Officer's own bonus (Gold: +150) to matter if it reached
            // this call site, so the sanity check below isn't vacuous.
            var scanners = new List<Scanner> { new() { Id = "scanner-1", Tier = TierColor.Grey, OwnerId = "player-1" } };

            // Baseline: the real call site's own shape (4 positional
            // args, matching MapPanel.cs's ScanPerformer.PerformScan(
            // activeShip, dockedPlanet, ShipsState.OwnedScanners,
            // GalaxyState.Galaxy.Planets) call exactly), before any
            // crew is ever assigned.
            var baseline = (ScanSucceeded)ScanPerformer.PerformScan(ship, dockedPlanet, scanners, GalaxyState.Galaxy.Planets);

            AddCrewMember("officer-1", tier: TierColor.Gold);
            _panel.OnAssignRole(ship.Id, "officer-1", ShipCrewRole.ScienceOfficer);
            ship = ShipsState.OwnedShips.Single(s => s.Id == ship.Id);

            // The exact same real 4-arg call site, now that a real,
            // assigned Gold-tier Science Officer exists on this ship.
            var afterAssignment = (ScanSucceeded)ScanPerformer.PerformScan(ship, dockedPlanet, scanners, GalaxyState.Galaxy.Planets);

            CollectionAssert.AreEquivalent(
                baseline.NewlyDiscovered.Select(p => p.Id).ToList(),
                afterAssignment.NewlyDiscovered.Select(p => p.Id).ToList(),
                "the real call site's own result must be identical before and after assigning a Science Officer -- proving the assignment has zero effect through the real, unwired call path, the same disconnection TradeMapScene.ts's own real performScan() call has");

            // Sanity check that the assignment WOULD have mattered if it
            // had been wired -- confirms the identical-result assertion
            // above isn't a false negative from a scan radius already too
            // small or too large for the bonus to matter either way.
            var withExplicitOfficer = (ScanSucceeded)ScanPerformer.PerformScan(
                ship, dockedPlanet, scanners, GalaxyState.Galaxy.Planets, CrewState.Crew.Single(m => m.Id == "officer-1"));
            Assert.Greater(withExplicitOfficer.NewlyDiscovered.Count, baseline.NewlyDiscovered.Count,
                "sanity check: explicitly passing the assigned Science Officer must discover strictly more planets than the real call site does -- confirms the disconnection proof above isn't vacuous");
        }
    }
}
