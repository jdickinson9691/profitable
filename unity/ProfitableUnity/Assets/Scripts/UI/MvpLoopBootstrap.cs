using Profitable.Unity.Content;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Agent 35 -- the single MonoBehaviour placed in Assets/Scenes/MvpLoop.unity.
    // Builds the entire UI hierarchy in code (see agent-35-unity-mvp
    // -presentation.md's Design decisions for why) and wires the four
    // panels together with a shared Inventory and log.
    public class MvpLoopBootstrap : MonoBehaviour
    {
        private Inventory _inventory = null!;
        private MapPanel _mapPanel = null!;
        private GatherPanel _gatherPanel = null!;
        private RefinePanel _refinePanel = null!;
        private CraftPanel _craftPanel = null!;
        private MarketPanel _marketPanel = null!;
        private Text _logText = null!;

        // Read-only accessor for the log's current text -- exists for
        // Agent 36's real click-through PlayMode test, which needs to
        // confirm a definitive outcome was logged without duplicating
        // Text-lookup-by-name logic (see agent-36-unity-migration
        // -phase1-integration.md's Outputs Section 2).
        public string LogText => _logText.text;

        private void Awake()
        {
            _inventory = new Inventory();
            Build();
        }

        private void Build()
        {
            var canvasGo = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(900, 700);

            var root = UiFactory.CreateVerticalGroup(canvasGo.transform, "Root", spacing: 10);
            var rootImage = root.gameObject.AddComponent<Image>();
            rootImage.color = UiFactory.PanelBackground;
            var rootRect = root;
            rootRect.anchorMin = Vector2.zero;
            rootRect.anchorMax = Vector2.one;
            rootRect.offsetMin = Vector2.zero;
            rootRect.offsetMax = Vector2.zero;

            UiFactory.CreateText(root, "Profitable -- Unity MVP Loop (Migration Phase 1)", 18);

            var nav = UiFactory.CreateHorizontalGroup(root, "Nav");
            var content = UiFactory.CreateVerticalGroup(root, "Content");

            _mapPanel = new MapPanel(content);
            _gatherPanel = new GatherPanel(content, _inventory, Log);
            _refinePanel = new RefinePanel(content, _inventory, Log);
            _craftPanel = new CraftPanel(content, _inventory, Log);
            _marketPanel = new MarketPanel(content, _inventory, Log);

            UiFactory.CreateButton(nav, "Map", () => ShowOnly(_mapPanel.Root));
            UiFactory.CreateButton(nav, "Gather", () => ShowOnly(_gatherPanel.Root));
            UiFactory.CreateButton(nav, "Refine", () => ShowOnly(_refinePanel.Root));
            UiFactory.CreateButton(nav, "Craft", () => ShowOnly(_craftPanel.Root));
            UiFactory.CreateButton(nav, "Market", () => ShowOnly(_marketPanel.Root));

            _logText = UiFactory.CreateText(root, "", 12);

            ShowOnly(_mapPanel.Root);
        }

        private void ShowOnly(GameObject visible)
        {
            _mapPanel.Root.SetActive(_mapPanel.Root == visible);
            _gatherPanel.Root.SetActive(_gatherPanel.Root == visible);
            _refinePanel.Root.SetActive(_refinePanel.Root == visible);
            _craftPanel.Root.SetActive(_craftPanel.Root == visible);
            _marketPanel.Root.SetActive(_marketPanel.Root == visible);
        }

        // Shared log sink passed to every panel -- also refreshes Refine
        // /Craft/Market's availability display, since almost any logged
        // action (a gather, a refine, a craft, a sell) changes Inventory's
        // contents.
        private void Log(string message)
        {
            _logText.text = $"{_logText.text}\n{message}".TrimStart('\n');
            _refinePanel.Refresh();
            _craftPanel.Refresh();
            _marketPanel.Refresh();
        }
    }
}
