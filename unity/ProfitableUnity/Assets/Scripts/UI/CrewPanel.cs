#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Migration Phase 2 Sub-Phase C (Crew) Presentation --
    // docs/agents/agent-51-unity-crew-presentation.md.
    //
    // The first panel in this migration whose UI hierarchy is rebuilt
    // (not just its status text) on every Refresh() -- a crew roster and
    // hire pool genuinely grow and shrink at runtime, unlike every prior
    // panel's fixed button set (see UiFactory.ClearChildren's own
    // comment). "Assign to Craft" reuses CraftPanel's exact Ion-Forged
    // Hull Plate recipe/material consumption, but with the crew member's
    // own tier as the crafter tier (via AssignToCraftSimulation) instead
    // of a player-picked TierPicker -- a fixed Blue schematic tier is used
    // for crew-assisted crafts, a presentation-layer simplification (not
    // a design decision) to avoid adding a second TierPicker widget for a
    // secondary crafting path.
    public class CrewPanel
    {
        public GameObject Root { get; }

        private static readonly TierColor CrewAssistedSchematicTier = TierColor.Blue;

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly Text _statusText;
        private readonly RectTransform _poolGroup;
        private readonly RectTransform _crewGroup;

        public CrewPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "CrewPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Crew", 20);
            _statusText = UiFactory.CreateText(group, "", 13);
            UiFactory.CreateButton(group, "Purchase Capacity", () => PurchaseCapacity());

            UiFactory.CreateText(group, "Available to hire:", 14);
            _poolGroup = UiFactory.CreateVerticalGroup(group, "CrewPool");

            UiFactory.CreateText(group, "Hired crew:", 14);
            _crewGroup = UiFactory.CreateVerticalGroup(group, "CrewRoster");

            Refresh();
        }

        private static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        public void Refresh()
        {
            var capacity = CrewState.Capacity;
            _statusText.text =
                $"Wallet: {MarketState.Wallet.Credits:F2} credits | " +
                $"Capacity: {CrewState.Crew.Count}/{capacity.BaseCapacity + capacity.PurchasedSlots}";

            UiFactory.ClearChildren(_poolGroup);
            var pool = CrewState.GetOrRefreshPool(NowMs());
            foreach (var candidate in pool.AvailableHires)
            {
                var row = UiFactory.CreateHorizontalGroup(_poolGroup, $"Candidate_{candidate.Id}");
                var label = candidate.Profession is null ? $"{candidate.Tier}" : $"{candidate.Tier} ({candidate.Profession})";
                UiFactory.CreateText(row, label, 12);
                UiFactory.CreateButton(row, $"Hire {candidate.Id}", () => Hire(candidate.Id));
            }

            UiFactory.ClearChildren(_crewGroup);
            foreach (var member in CrewState.Crew)
            {
                var row = UiFactory.CreateHorizontalGroup(_crewGroup, $"Member_{member.Id}");
                UiFactory.CreateText(row, $"{member.Tier} [{member.Status}]", 12);
                UiFactory.CreateButton(row, $"Pay Upkeep {member.Id}", () => PayCrewUpkeep(member.Id));
                UiFactory.CreateButton(row, $"Dismiss {member.Id}", () => Dismiss(member.Id));
                if (member.Status == CrewStatus.Idle)
                {
                    UiFactory.CreateButton(row, $"Assign to Craft {member.Id}", () => AssignToCraft(member.Id));
                }
            }
        }

        // Public entry points -- exercised directly by EditMode tests,
        // same convention as every other panel's trigger methods.
        public HireResult Hire(string candidateId)
        {
            var pool = CrewState.GetOrRefreshPool(NowMs());
            var candidate = pool.AvailableHires.FirstOrDefault(c => c.Id == candidateId);
            if (candidate is null)
            {
                var rejected = new HireRejected { Reason = $"'{candidateId}' is not in this planet's crew pool" };
                _log($"Hire failed: {rejected.Reason}");
                return rejected;
            }

            var result = HireCrewSimulation.HireCrew(candidate, pool, CrewState.Capacity, CrewState.Crew, MarketState.Wallet, MarketState.Wallet.PlayerId, NowMs());

            if (result is HireSucceeded succeeded)
            {
                CrewState.Crew.Add(succeeded.CrewMember);
                CrewState.SetPool(succeeded.UpdatedPool);
                MarketState.SetWallet(succeeded.UpdatedWallet);
                _log($"Hired {succeeded.CrewMember.Tier} crew member ({succeeded.CrewMember.Id}).");
            }
            else
            {
                _log($"Hire failed: {((HireRejected)result).Reason}");
            }

            Refresh();
            return result;
        }

        public PaymentResult PayCrewUpkeep(string crewMemberId)
        {
            var member = CrewState.Crew.FirstOrDefault(m => m.Id == crewMemberId);
            if (member is null)
            {
                _log($"Pay upkeep failed: no crew member '{crewMemberId}'.");
                return new PaymentInsufficientFunds();
            }

            var result = PayUpkeepSimulation.PayUpkeep(member, MarketState.Wallet, NowMs());
            switch (result)
            {
                case PaymentPaid paid:
                    ReplaceCrewMember(paid.UpdatedCrewMember);
                    MarketState.SetWallet(paid.UpdatedWallet);
                    _log($"Paid upkeep for {member.Id} ({paid.UpdatedWallet.Credits:F2} credits remaining).");
                    break;
                case PaymentNotDue:
                    _log($"Upkeep not yet due for {member.Id}.");
                    break;
                case PaymentInsufficientFunds:
                    _log($"Insufficient funds to pay {member.Id}'s upkeep.");
                    break;
            }

            CheckAndApplyAttrition(crewMemberId);
            Refresh();
            return result;
        }

        private void CheckAndApplyAttrition(string crewMemberId)
        {
            var member = CrewState.Crew.FirstOrDefault(m => m.Id == crewMemberId);
            if (member is null) return;

            var attrition = CheckAttritionSimulation.CheckAttrition(member, NowMs());
            if (attrition.Departed)
            {
                CrewState.Crew.Remove(member);
                _log($"{member.Id} departed: {attrition.Reason}.");
            }
        }

        public DismissResult Dismiss(string crewMemberId)
        {
            var member = CrewState.Crew.FirstOrDefault(m => m.Id == crewMemberId);
            if (member is null)
            {
                var missing = new DismissResult { Dismissed = false, Reason = $"no crew member '{crewMemberId}'" };
                _log($"Dismiss failed: {missing.Reason}");
                return missing;
            }

            var result = DismissCrewSimulation.DismissCrew(member, MarketState.Wallet.PlayerId);
            if (result.Dismissed)
            {
                CrewState.Crew.Remove(member);
                _log($"Dismissed {member.Id}.");
            }
            else
            {
                _log($"Dismiss failed: {result.Reason}");
            }

            Refresh();
            return result;
        }

        public AssignResult AssignToCraft(string crewMemberId)
        {
            var member = CrewState.Crew.FirstOrDefault(m => m.Id == crewMemberId);
            if (member is null)
            {
                var rejected = new AssignRejected { Reason = $"no crew member '{crewMemberId}'" };
                _log($"Assign failed: {rejected.Reason}");
                return rejected;
            }

            var recipe = GameContent.IonForgedHullPlateRecipe;
            var alloyBarId = GameContent.RadiantAlloyBar.Id;
            var gasId = GameContent.HydrogenGas.Id;
            var alloyBarSlotQuantity = recipe.Inputs[0].Quantity;
            var gasSlotQuantity = recipe.Inputs[1].Quantity;

            if (_inventory.TotalQuantity(alloyBarId) < alloyBarSlotQuantity || _inventory.TotalQuantity(gasId) < gasSlotQuantity)
            {
                var rejected = new AssignRejected { Reason = $"need {alloyBarSlotQuantity}x {alloyBarId} and {gasSlotQuantity}x {gasId}" };
                _log($"Assign failed: {rejected.Reason}");
                return rejected;
            }

            var inputs = new List<ResourceInstance>();
            inputs.AddRange(_inventory.Take(alloyBarId, alloyBarSlotQuantity));
            inputs.AddRange(_inventory.Take(gasId, gasSlotQuantity));

            var craftAction = new CraftAction { Id = $"crew-craft-{member.Id}-{NowMs()}", Inputs = inputs, Recipe = recipe, SchematicTier = CrewAssistedSchematicTier };
            var result = AssignToCraftSimulation.AssignToCraft(member, craftAction);
            var assigned = (AssignSucceeded)result;

            ReplaceCrewMember(assigned.UpdatedCrewMember);

            if (assigned.CraftResult is CraftAccepted accepted)
            {
                _log($"{member.Id} crafted {recipe.OutputQuantity}x Ion-Forged Hull Plate: {GatherPanel.DescribeQualities(accepted.Qualities)}");
            }
            else if (assigned.CraftResult is CraftRejected craftRejected)
            {
                // A rejected craft never happened -- same "return the
                // consumed materials" rule CraftPanel already follows.
                foreach (var instance in inputs) _inventory.Add(instance);
                _log($"{member.Id}'s craft rejected: {craftRejected.Reason}");
            }

            Refresh();
            return result;
        }

        public PurchaseCapacityResult PurchaseCapacity()
        {
            var result = PurchaseCapacitySimulation.PurchaseCapacity(CrewState.Capacity, MarketState.Wallet);
            if (result is PurchaseCapacitySucceeded succeeded)
            {
                CrewState.SetCapacity(succeeded.UpdatedCapacity);
                MarketState.SetWallet(succeeded.UpdatedWallet);
                _log($"Purchased crew capacity slot ({succeeded.UpdatedCapacity.PurchasedSlots} purchased).");
            }
            else
            {
                _log($"Purchase capacity failed: {((PurchaseCapacityRejected)result).Reason}");
            }

            Refresh();
            return result;
        }

        private void ReplaceCrewMember(CrewMember updated)
        {
            var index = CrewState.Crew.FindIndex(m => m.Id == updated.Id);
            if (index >= 0) CrewState.Crew[index] = updated;
        }
    }
}
