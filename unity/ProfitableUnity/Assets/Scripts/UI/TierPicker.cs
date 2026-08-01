using System.Collections.Generic;
using Profitable.Core.Schema;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Agent 35 -- a reusable row of 7 tier buttons (Grey-Gold), shared by
    // RefinePanel (refiner tier) and CraftPanel (schematic/crafter
    // tiers). See agent-35-unity-mvp-presentation.md's Design decisions
    // for why this is a fixed button row rather than a dropdown.
    public class TierPicker
    {
        private static readonly TierColor[] AllTiers =
        {
            TierColor.Grey, TierColor.White, TierColor.Green, TierColor.Blue,
            TierColor.Purple, TierColor.Orange, TierColor.Gold,
        };

        private static readonly Color SelectedColor = new(0.35f, 0.55f, 0.35f, 1f);

        public TierColor SelectedTier { get; private set; } = TierColor.Grey;

        private readonly Dictionary<TierColor, Image> _buttonImages = new();

        public TierPicker(Transform parent, string label)
        {
            UiFactory.CreateText(parent, label, 13);
            var row = UiFactory.CreateHorizontalGroup(parent, $"TierRow_{label}");

            foreach (var tier in AllTiers)
            {
                var capturedTier = tier;
                var button = UiFactory.CreateButton(row, tier.ToString(), () => Select(capturedTier));
                _buttonImages[tier] = button.GetComponent<Image>();
            }

            RefreshVisuals();
        }

        private void Select(TierColor tier)
        {
            SelectedTier = tier;
            RefreshVisuals();
        }

        private void RefreshVisuals()
        {
            foreach (var (tier, image) in _buttonImages)
            {
                image.color = tier == SelectedTier ? SelectedColor : UiFactory.ButtonColor;
            }
        }
    }
}
