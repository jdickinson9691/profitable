#nullable enable
using System;
using System.Linq;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Ports src/presentation/scenes/ShipStatusScene.ts's crew-role
    // assign/unassign flow specifically (RenderCrewRoles()/
    // RenderAssignmentControls()/OnAssignRole()/OnUnassignRole() below
    // mirror that file's renderCrewRoles()/renderAssignmentControls()/
    // onAssignRole()/onUnassignRole() exactly). Ship Status's other
    // concerns (fuel/cargo/component display, Check Repair) already live
    // in ShipsPanel.cs/ShipAssemblyPanel.cs in this Unity build, which has
    // never mirrored TS's scene boundaries 1:1 (ShipsPanel.CheckRepair()
    // already folded in what was ShipStatusScene.ts's own action). This
    // panel is the one genuinely new surface: real assignment UI for all
    // 5 roles (Pilot/Combat Engineer/Science Officer/Systems Engineer/
    // Crafter), slot counts scaling by ship tier exactly per the existing
    // ShipCrewSlotResolver.GetCrewSlotsForShip() (called, never
    // reimplemented). Its own nav entry ("Ship Roles," not "Ship," to
    // stay visually distinct from the existing "Ships" purchase/travel
    // panel).
    //
    // Real regression fix: before this panel existed, no crew member in
    // this Unity build could ever hold a ShipRole at all (no UI wrote
    // CrewMember.ShipRole/AssignedShipId), so ShipsPanel.CheckRepair()'s
    // and ResolveCombatChoice()'s already-real ownedCrew arguments
    // (CrewState.Crew, unchanged by this panel) could never contain an
    // assigned Systems Engineer/Crafter/Combat Engineer --
    // ComponentRepairResolver.ResolveComponentRepair() restored zero
    // durability on every call, a documented no-op (planet-ownership.md's
    // own retroactive-removal note, resolved as of this panel). Now that
    // real assignment exists, both call sites just work -- neither needed
    // any code change, only real assigned crew for them to read.
    //
    // Faithful port of the real disconnection too, not silently fixed:
    // Pilot and Science Officer both get real, working assignment UI
    // below (matching TS's full 5-role screen exactly), but neither is
    // wired into any travel/scan formula. ShipsPanel.InitiateVoyageTo()'s
    // VoyageInitiator.InitiateVoyage() call and MapPanel's
    // ScanPerformer.PerformScan() call are both deliberately left
    // untouched by this change -- confirmed by reading
    // src/presentation/scenes/TradeMapScene.ts directly: CalculateTravelTime()/
    // PerformScan() both already have a real, parity-tested optional
    // pilot/scienceOfficer parameter, but TradeMapScene.ts's own real call
    // sites (the only place a voyage is initiated or a scan performed)
    // never pass one either. A crew member can be assigned as Pilot or
    // Science Officer here and it will have zero effect on travel time or
    // scan radius on either engine, today -- not a bug, the same real gap
    // the TypeScript source itself has. Whether to actually wire either
    // side up is a deliberate product decision for a future session, on
    // both engines at once, not something to slip in unilaterally on just
    // the Unity port.
    public class ShipCrewRolesPanel
    {
        public GameObject Root { get; }

        private readonly Action<string> _log;
        private readonly RectTransform _shipsGroup;

        // Ports src/data/types/shipCrewRole.ts's fixed role list/order.
        private static readonly ShipCrewRole[] AllRoles =
        {
            ShipCrewRole.Pilot, ShipCrewRole.CombatEngineer, ShipCrewRole.ScienceOfficer,
            ShipCrewRole.SystemsEngineer, ShipCrewRole.Crafter,
        };

        public ShipCrewRolesPanel(Transform parent, Action<string> log)
        {
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "ShipCrewRolesPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Ship Crew Roles", 20);
            _shipsGroup = UiFactory.CreateVerticalGroup(group, "Ships");

            Refresh();
        }

        public void Refresh()
        {
            UiFactory.ClearChildren(_shipsGroup);
            var roster = ShipsState.OwnedShips;
            if (roster.Count == 0)
            {
                UiFactory.CreateText(_shipsGroup, "(no ships owned yet -- purchase one at the Shipyard)", 13);
                return;
            }

            foreach (var ship in roster)
            {
                RenderShip(ship);
            }
        }

        private void RenderShip(Ship ship)
        {
            UiFactory.CreateText(_shipsGroup, $"{ship.Name} -- {ship.Tier} tier", 15);
            RenderCrewRoles(ship);
            RenderAssignmentControls(ship);
        }

        // Ports ShipStatusScene.renderCrewRoles() exactly -- capacity per
        // role read from the real GetCrewSlotsForShip() lookup, never a
        // second, hand-maintained table.
        private void RenderCrewRoles(Ship ship)
        {
            UiFactory.CreateText(_shipsGroup, "Crew roles:", 13);
            var slots = ShipCrewSlotResolver.GetCrewSlotsForShip(ship);
            var roster = CrewState.Crew;

            foreach (var role in AllRoles)
            {
                var capacity = CapacityForRole(slots, role);
                var occupants = roster.Where(m => m.AssignedShipId == ship.Id && m.ShipRole == role).ToList();
                UiFactory.CreateText(_shipsGroup, $"  {role} ({occupants.Count}/{capacity}):", 12);
                foreach (var member in occupants)
                {
                    var profLabel = member.Profession is null ? "" : $" ({member.Profession})";
                    UiFactory.CreateText(_shipsGroup, $"    {member.Tier}{profLabel}", 11);
                }
            }
        }

        // CombatEngineerOrScienceOfficer is a single combined pool shared
        // by both roles, not two independent caps -- same rule
        // ShipRoleAssigner.AssignToShipRole() itself already enforces.
        private static int CapacityForRole(CrewSlotsByTierEntry slots, ShipCrewRole role) => role switch
        {
            ShipCrewRole.Pilot => slots.Pilot,
            ShipCrewRole.CombatEngineer or ShipCrewRole.ScienceOfficer => slots.CombatEngineerOrScienceOfficer,
            ShipCrewRole.SystemsEngineer => slots.SystemsEngineer,
            ShipCrewRole.Crafter => slots.Crafter,
            _ => throw new ArgumentOutOfRangeException(nameof(role)),
        };

        // Ports ShipStatusScene.renderAssignmentControls() exactly.
        private void RenderAssignmentControls(Ship ship)
        {
            UiFactory.CreateText(_shipsGroup, "Assign crew to a role on this ship:", 13);
            var roster = CrewState.Crew;
            if (roster.Count == 0)
            {
                UiFactory.CreateText(_shipsGroup, "  (no crew hired yet -- hire crew at the Crew screen)", 12);
                return;
            }

            foreach (var member in roster)
            {
                var current = member.AssignedShipId == ship.Id
                    ? $" [current: {member.ShipRole}]"
                    : member.AssignedShipId is not null
                        ? " [assigned to another ship]"
                        : "";
                var profLabel = member.Profession is null ? "" : $" ({member.Profession})";
                UiFactory.CreateText(_shipsGroup, $"  {member.Tier}{profLabel}{current}", 12);

                var row = UiFactory.CreateHorizontalGroup(_shipsGroup, $"Controls_{ship.Id}_{member.Id}");
                foreach (var role in AllRoles)
                {
                    // Eligibility (ship.md's own Must-Not-Do): only
                    // Crafter is gated by profession -- the other 4 roles
                    // accept any crew member, any tier. An ineligible
                    // role is simply not offered as a button.
                    if (role == ShipCrewRole.Crafter && member.Profession is null) continue;
                    // Id-suffixed label -- multiple crew members/ships
                    // would otherwise all render an identically-named
                    // "Button_Pilot" etc., the same disambiguation
                    // convention every other multi-instance button in
                    // this codebase already uses (ShipsPanel's
                    // "Refuel {ship.Id}", "Attack {encounter.Id}", ...).
                    UiFactory.CreateButton(row, $"{role} {member.Id}", () => OnAssignRole(ship.Id, member.Id, role));
                }
                // Closes the same gap ShipStatusScene.ts's own comment
                // documents: only offered when currently assigned to THIS
                // ship -- unassigning from elsewhere isn't this ship's
                // row to control.
                if (member.AssignedShipId == ship.Id)
                {
                    UiFactory.CreateButton(row, $"Unassign {member.Id}", () => OnUnassignRole(member.Id));
                }
            }
        }

        // Public entry points -- exercised directly by EditMode tests,
        // same convention as every other panel's trigger methods.
        public AssignShipRoleResult? OnAssignRole(string shipId, string crewMemberId, ShipCrewRole role)
        {
            var ship = ShipsState.OwnedShips.FirstOrDefault(s => s.Id == shipId);
            var member = CrewState.Crew.FirstOrDefault(m => m.Id == crewMemberId);
            if (ship is null || member is null)
            {
                _log("Assign failed: ship or crew member not found.");
                return null;
            }

            var result = ShipRoleAssigner.AssignToShipRole(member, ship, role, CrewState.Crew);
            if (result is AssignShipRoleSucceeded succeeded)
            {
                ReplaceCrewMember(succeeded.UpdatedCrewMember);
                _log($"Assigned {succeeded.UpdatedCrewMember.Tier} crew member as {role} on {ship.Name}.");
            }
            else
            {
                _log($"Assign failed: {((AssignShipRoleRejected)result).Reason}");
            }

            Refresh();
            return result;
        }

        public UnassignShipRoleResult? OnUnassignRole(string crewMemberId)
        {
            var member = CrewState.Crew.FirstOrDefault(m => m.Id == crewMemberId);
            if (member is null)
            {
                _log("Unassign failed: crew member not found.");
                return null;
            }

            var result = ShipRoleUnassigner.UnassignFromShipRole(member);
            if (result is UnassignShipRoleSucceeded succeeded)
            {
                ReplaceCrewMember(succeeded.UpdatedCrewMember);
                _log($"Unassigned {succeeded.UpdatedCrewMember.Tier} crew member.");
            }
            else
            {
                _log($"Unassign failed: {((UnassignShipRoleRejected)result).Reason}");
            }

            Refresh();
            return result;
        }

        private static void ReplaceCrewMember(CrewMember updated)
        {
            var index = CrewState.Crew.FindIndex(m => m.Id == updated.Id);
            if (index >= 0) CrewState.Crew[index] = updated;
        }
    }
}
