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
        private ShipAssemblyPanel _shipAssemblyPanel = null!;
        private MarketPanel _marketPanel = null!;
        private CrewPanel _crewPanel = null!;
        private ShipsPanel _shipsPanel = null!;
        private Text _logText = null!;

        // Read-only accessor for the log's current text -- exists for
        // Agent 36's real click-through PlayMode test, which needs to
        // confirm a definitive outcome was logged without duplicating
        // Text-lookup-by-name logic (see agent-36-unity-migration
        // -phase1-integration.md's Outputs Section 2).
        public string LogText => _logText.text;

        // Read-only accessor for the shared Inventory instance -- exists
        // for ShipAssemblyPanel's own click-through PlayMode test, which
        // needs to seed real component-recipe inputs (refined materials no
        // tutorial guarantee ever produces, unlike FullLoopClickThroughTest
        // .cs's own igneous-ore/autunite-crystal/hydrogen-gas) directly
        // into the real, already-constructed Inventory before clicking the
        // real Craft & Install button -- isolating "does the click
        // correctly consume/craft/install/overwrite" from "is this exact
        // refined material reachable via a real gather+refine chain on
        // this fixed test galaxy," which is GatherPanel's/RefinePanel's own
        // test surface, not this one's. Same seam shape LogText already
        // establishes for test-only read access.
        public Inventory Inventory => _inventory;

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

            // ShipsPanel is constructed before MapPanel -- MapPanel's own
            // real destination-selection (2026-08-04) delegates voyage
            // initiation to it, so it needs the real instance to exist
            // first. Nav button order below is unaffected -- Map still
            // shows/opens first, only construction order changed.
            _shipsPanel = new ShipsPanel(content, _inventory, Log);
            _mapPanel = new MapPanel(content, _shipsPanel, Log);
            _gatherPanel = new GatherPanel(content, _inventory, Log);
            _refinePanel = new RefinePanel(content, _inventory, Log);
            _craftPanel = new CraftPanel(content, _inventory, Log);
            _shipAssemblyPanel = new ShipAssemblyPanel(content, _inventory, Log);
            _marketPanel = new MarketPanel(content, _inventory, Log);
            _crewPanel = new CrewPanel(content, _inventory, Log);

            UiFactory.CreateButton(nav, "Map", () => ShowOnly(_mapPanel.Root));
            UiFactory.CreateButton(nav, "Gather", () => ShowOnly(_gatherPanel.Root));
            UiFactory.CreateButton(nav, "Refine", () => ShowOnly(_refinePanel.Root));
            UiFactory.CreateButton(nav, "Craft", () => ShowOnly(_craftPanel.Root));
            // Immediately after Craft, mirroring nav.ts's own
            // Shipyard-Assembly-Ship cluster ordering and CraftScene.ts's
            // own "component recipes are ShipAssemblyScene's exclusive
            // domain" split -- its own nav entry, never folded into the
            // Craft button above.
            UiFactory.CreateButton(nav, "Assembly", () => ShowOnly(_shipAssemblyPanel.Root));
            UiFactory.CreateButton(nav, "Market", () => ShowOnly(_marketPanel.Root));
            UiFactory.CreateButton(nav, "Crew", () => ShowOnly(_crewPanel.Root));
            UiFactory.CreateButton(nav, "Ships", () => ShowOnly(_shipsPanel.Root));

            _logText = UiFactory.CreateText(root, "", 12);

            ShowOnly(_mapPanel.Root);
        }

        private void ShowOnly(GameObject visible)
        {
            _mapPanel.Root.SetActive(_mapPanel.Root == visible);
            _gatherPanel.Root.SetActive(_gatherPanel.Root == visible);
            _refinePanel.Root.SetActive(_refinePanel.Root == visible);
            _craftPanel.Root.SetActive(_craftPanel.Root == visible);
            _shipAssemblyPanel.Root.SetActive(_shipAssemblyPanel.Root == visible);
            _marketPanel.Root.SetActive(_marketPanel.Root == visible);
            _crewPanel.Root.SetActive(_crewPanel.Root == visible);
            _shipsPanel.Root.SetActive(_shipsPanel.Root == visible);
        }

        // Shared log sink passed to every panel -- also refreshes Gather
        // /Refine/Craft/Market/Crew/Ships's availability display, since
        // almost any logged action changes Inventory's/CrewState's/
        // ShipsState's/PlanetOwnershipState's contents.
        private void Log(string message)
        {
            _logText.text = $"{_logText.text}\n{message}".TrimStart('\n');
            _mapPanel.Refresh();
            _gatherPanel.RefreshOwnership();
            _refinePanel.Refresh();
            _craftPanel.Refresh();
            _shipAssemblyPanel.Refresh();
            _marketPanel.Refresh();
            _crewPanel.Refresh();
            _shipsPanel.Refresh();
        }
    }
}
