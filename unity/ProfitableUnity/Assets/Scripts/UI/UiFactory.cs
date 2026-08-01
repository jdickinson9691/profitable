using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Agent 35 -- small shared helpers for the code-driven UI construction
    // this agent uses instead of hand-placed Editor scene authoring (see
    // agent-35-unity-mvp-presentation.md's Design decisions). Not a
    // general-purpose UI framework -- just enough to keep the panel
    // scripts free of repeated boilerplate.
    public static class UiFactory
    {
        public static readonly Color PanelBackground = new(0.1f, 0.1f, 0.1f, 1f);
        public static readonly Color ButtonColor = new(0.2f, 0.25f, 0.2f, 1f);
        public static readonly Color TextColor = Color.white;

        public static RectTransform CreateVerticalGroup(Transform parent, string name, int spacing = 6)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(VerticalLayoutGroup), typeof(ContentSizeFitter));
            go.transform.SetParent(parent, false);

            var layout = go.GetComponent<VerticalLayoutGroup>();
            layout.spacing = spacing;
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
            layout.childControlHeight = true;
            layout.childControlWidth = true;
            layout.padding = new RectOffset(8, 8, 8, 8);

            var fitter = go.GetComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            return go.GetComponent<RectTransform>();
        }

        public static RectTransform CreateHorizontalGroup(Transform parent, string name, int spacing = 6)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(HorizontalLayoutGroup), typeof(ContentSizeFitter));
            go.transform.SetParent(parent, false);

            var layout = go.GetComponent<HorizontalLayoutGroup>();
            layout.spacing = spacing;
            layout.childForceExpandWidth = false;
            layout.childForceExpandHeight = true;
            layout.childControlHeight = true;
            layout.childControlWidth = true;

            var fitter = go.GetComponent<ContentSizeFitter>();
            fitter.horizontalFit = ContentSizeFitter.FitMode.PreferredSize;

            return go.GetComponent<RectTransform>();
        }

        public static Text CreateText(Transform parent, string text, int fontSize = 16)
        {
            var go = new GameObject("Text", typeof(RectTransform), typeof(Text), typeof(LayoutElement));
            go.transform.SetParent(parent, false);

            var t = go.GetComponent<Text>();
            t.text = text;
            t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            t.fontSize = fontSize;
            t.color = TextColor;
            t.alignment = TextAnchor.UpperLeft;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;

            var layoutElement = go.GetComponent<LayoutElement>();
            layoutElement.minHeight = fontSize + 6;

            return t;
        }

        public static Button CreateButton(Transform parent, string label, System.Action onClick)
        {
            var go = new GameObject($"Button_{label}", typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            go.transform.SetParent(parent, false);

            var image = go.GetComponent<Image>();
            image.color = ButtonColor;

            var layoutElement = go.GetComponent<LayoutElement>();
            layoutElement.minWidth = 90;
            layoutElement.minHeight = 28;

            var button = go.GetComponent<Button>();
            button.onClick.AddListener(() => onClick());

            var textTransform = CreateText(go.transform, label, 13);
            textTransform.alignment = TextAnchor.MiddleCenter;
            var textRect = textTransform.GetComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;

            return button;
        }
    }
}
