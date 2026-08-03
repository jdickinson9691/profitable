import Phaser from "phaser";
import { isDebugModeEnabled } from "../debugFlag.ts";

export const SCENE_KEYS = {
  map: "Map",
  gather: "Gather",
  refine: "Refine",
  craft: "Craft",
  market: "Market",
  globalMarket: "GlobalMarket",
  tradeMap: "TradeMap",
  crew: "Crew",
  shipyard: "Shipyard",
  shipAssembly: "ShipAssembly",
  shipStatus: "ShipStatus",
  settings: "Settings",
  debugPanel: "DebugPanel",
} as const;

const NAV_ITEMS: Array<{ key: string; label: string }> = [
  { key: SCENE_KEYS.map, label: "Map" },
  { key: SCENE_KEYS.gather, label: "Gather" },
  { key: SCENE_KEYS.refine, label: "Refine" },
  { key: SCENE_KEYS.craft, label: "Craft" },
  { key: SCENE_KEYS.market, label: "Market" },
  { key: SCENE_KEYS.globalMarket, label: "Global" },
  { key: SCENE_KEYS.tradeMap, label: "TradeMap" },
  { key: SCENE_KEYS.crew, label: "Crew" },
  { key: SCENE_KEYS.shipyard, label: "Shipyard" },
  { key: SCENE_KEYS.shipAssembly, label: "Assembly" },
  { key: SCENE_KEYS.shipStatus, label: "Ship" },
  { key: SCENE_KEYS.settings, label: "Settings" },
];

// Debug-only nav entry -- appended, never part of the base NAV_ITEMS array,
// so a production build (or a plain `npm run dev` session without
// `?debug=1`) never renders or wires a click handler for it at all. Same
// two-layer gate as devSeed.ts's own debug hook (debugFlag.ts's own
// comment: import.meta.env.DEV eliminates it from a production bundle
// entirely; the URL param keeps it off by default even in dev).
const DEBUG_NAV_ITEM = { key: SCENE_KEYS.debugPanel, label: "Debug" };

const NAV_ROW_HEIGHT = 22;

// Persistent nav bar on every scene, so the player can move freely between
// map/gather/refine/craft rather than being locked into one linear path.
//
// Bug fix (Galactic Map Agent 25/26 verification, item 3 of
// profitable-map-gdd.md Section 7): 10 entries (grown across Phase 3/4/5,
// none of which revisited this file's layout) no longer fit on one row at
// the game's 800px width -- live-measured to overflow by 32px. Wraps to a
// second row instead of hardcoding a fixed item count or shrinking text;
// scales correctly if more entries are ever added later too. Every scene's
// own content still starts at a fixed y=64, which still clears a wrapped
// 2-row nav bar (row 2 ends well before y=64) without needing every scene
// to be touched to read back a dynamic nav-bar height.
export function renderNav(scene: Phaser.Scene, activeKey: string): void {
  const maxWidth = scene.cameras.main.width;
  const items = isDebugModeEnabled() ? [...NAV_ITEMS, DEBUG_NAV_ITEM] : NAV_ITEMS;
  let x = 16;
  let y = 16;
  for (const item of items) {
    const isActive = item.key === activeKey;
    const text = scene.add.text(x, y, item.label, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: isActive ? "#ffd700" : "#ffffff",
    });
    if (x > 16 && x + text.width > maxWidth - 16) {
      x = 16;
      y += NAV_ROW_HEIGHT;
      text.setPosition(x, y);
    }
    if (!isActive) {
      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => scene.scene.start(item.key));
    }
    x += text.width + 24;
  }
}
