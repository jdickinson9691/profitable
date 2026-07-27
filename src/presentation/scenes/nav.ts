import Phaser from "phaser";

export const SCENE_KEYS = {
  map: "Map",
  gather: "Gather",
  refine: "Refine",
  craft: "Craft",
  market: "Market",
  globalMarket: "GlobalMarket",
  tradeMap: "TradeMap",
} as const;

const NAV_ITEMS: Array<{ key: string; label: string }> = [
  { key: SCENE_KEYS.map, label: "Map" },
  { key: SCENE_KEYS.gather, label: "Gather" },
  { key: SCENE_KEYS.refine, label: "Refine" },
  { key: SCENE_KEYS.craft, label: "Craft" },
  { key: SCENE_KEYS.market, label: "Market" },
  { key: SCENE_KEYS.globalMarket, label: "Global" },
  { key: SCENE_KEYS.tradeMap, label: "TradeMap" },
];

// Persistent nav bar on every scene, so the player can move freely between
// map/gather/refine/craft rather than being locked into one linear path.
export function renderNav(scene: Phaser.Scene, activeKey: string): void {
  let x = 16;
  const y = 16;
  for (const item of NAV_ITEMS) {
    const isActive = item.key === activeKey;
    const text = scene.add.text(x, y, item.label, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: isActive ? "#ffd700" : "#ffffff",
    });
    if (!isActive) {
      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => scene.scene.start(item.key));
    }
    x += text.width + 24;
  }
}
