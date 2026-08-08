using Profitable.Unity.Content;
using Profitable.Unity.DebugTools;
using UnityEngine;
using UnityEngine.InputSystem;
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
        private ShipCrewRolesPanel _shipCrewRolesPanel = null!;
        private MarketPanel _marketPanel = null!;
        private CrewPanel _crewPanel = null!;
        private ShipsPanel _shipsPanel = null!;
        // Nullable -- only constructed when DebugGate.IsEnabled() at
        // boot (Application.isEditor, or the persisted standalone flag).
        // A packaged, non-debug build never constructs this at all, same
        // reachability guarantee nav.ts's own isDebugModeEnabled() gate
        // gives the TypeScript nav entry.
        private DebugPanel? _debugPanel;
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

        // Part 5's own required standard: "confirm this is genuinely
        // absent from a real packaged, non-debug build the same way the
        // TS panel's code-splitting was verified absent from its
        // production bundle." C# has no dead-code-elimination
        // equivalent (DebugPanel's class bytes always ship in the
        // assembly), so the real, behavioral proof is reachability --
        // this self-check exists solely to make that externally
        // observable from a genuine `-batchmode` run of a real
        // Standalone build, via a single Player.log line, without
        // requiring interactive clicking against a headless build. Only
        // active behind an explicit `-selfTestDebugGate` command-line
        // flag no normal launch (Editor Play mode, a real player double
        // -clicked by a user) ever passes -- harmless no-op otherwise.
        private void Start()
        {
            if (System.Array.IndexOf(System.Environment.GetCommandLineArgs(), "-selfTestDebugGate") < 0) return;

            Debug.Log($"[SelfTestDebugGate] IsEditor={Application.isEditor} " +
                      $"DebugGateIsEnabled={DebugGate.IsEnabled()} " +
                      $"DebugPanelConstructed={_debugPanel is not null}");
            Application.Quit();
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
            _shipCrewRolesPanel = new ShipCrewRolesPanel(content, Log);
            _marketPanel = new MarketPanel(content, _inventory, Log);
            _crewPanel = new CrewPanel(content, _inventory, Log);
            if (DebugGate.IsEnabled())
            {
                _debugPanel = new DebugPanel(content, Log);
            }

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
            // "Ship Roles," not "Ship" -- TS's own ShipStatusScene nav
            // label is "Ship," but this Unity build already has a "Ships"
            // (purchase/travel) nav button; a second, single-character-
            // different "Ship" label would be a real UX ambiguity TS
            // doesn't have to avoid, so this uses a clearly distinct label
            // instead. Presentation-layer wording, not a behavior
            // deviation -- see ShipCrewRolesPanel.cs's own doc comment.
            UiFactory.CreateButton(nav, "Ship Roles", () => ShowOnly(_shipCrewRolesPanel.Root));
            UiFactory.CreateButton(nav, "Market", () => ShowOnly(_marketPanel.Root));
            UiFactory.CreateButton(nav, "Crew", () => ShowOnly(_crewPanel.Root));
            UiFactory.CreateButton(nav, "Ships", () => ShowOnly(_shipsPanel.Root));
            if (_debugPanel is not null)
            {
                var debugPanel = _debugPanel;
                UiFactory.CreateButton(nav, "Debug", () => ShowOnly(debugPanel.Root));
            }

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
            _shipCrewRolesPanel.Root.SetActive(_shipCrewRolesPanel.Root == visible);
            _marketPanel.Root.SetActive(_marketPanel.Root == visible);
            _crewPanel.Root.SetActive(_crewPanel.Root == visible);
            _shipsPanel.Root.SetActive(_shipsPanel.Root == visible);
            if (_debugPanel is not null) _debugPanel.Root.SetActive(_debugPanel.Root == visible);
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
            _shipCrewRolesPanel.Refresh();
            _marketPanel.Refresh();
            _crewPanel.Refresh();
            _shipsPanel.Refresh();
            _debugPanel?.Refresh();
        }

        // Standalone-build debug-mode toggle -- Editor sessions are
        // always in debug mode already (DebugGate.IsEnabled()'s
        // Application.isEditor branch), so this shortcut only matters
        // for a packaged player, where there is no other way to flip the
        // persisted flag. Flipping it here does not make the Debug panel
        // appear this session (see DebugGate.Toggle()'s own comment) --
        // an actual restart is required, matching TS's own
        // location.reload() re-check pattern exactly.
        //
        // Uses UnityEngine.InputSystem (this project's ProjectSettings
        // has activeInputHandler set to the new Input System package
        // only -- the legacy UnityEngine.Input class throws at runtime
        // here, confirmed by a real PlayMode test run) rather than the
        // legacy UnityEngine.Input class every other in-scene control in
        // this codebase avoids needing, since a UI Button's onClick
        // never touches either Input API directly.
        private void Update()
        {
            var keyboard = Keyboard.current;
            if (keyboard is null) return;

            var ctrl = keyboard.leftCtrlKey.isPressed || keyboard.rightCtrlKey.isPressed;
            var shift = keyboard.leftShiftKey.isPressed || keyboard.rightShiftKey.isPressed;
            if (ctrl && shift && keyboard.dKey.wasPressedThisFrame)
            {
                var enabled = DebugGate.Toggle();
                Log(enabled
                    ? "Debug mode enabled. Restart the game for the Debug panel to become reachable."
                    : "Debug mode disabled. Restart the game for the Debug panel to stop being reachable.");
            }
        }
    }
}
