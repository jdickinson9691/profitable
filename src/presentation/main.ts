import Phaser from "phaser";
import { MapScene } from "./scenes/MapScene.ts";
import { GatherScene } from "./scenes/GatherScene.ts";
import { RefineScene } from "./scenes/RefineScene.ts";
import { CraftScene } from "./scenes/CraftScene.ts";
import { MarketScene } from "./scenes/MarketScene.ts";
import { GlobalMarketScene } from "./scenes/GlobalMarketScene.ts";
import { TradeMapScene } from "./scenes/TradeMapScene.ts";
import { CrewScene } from "./scenes/CrewScene.ts";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 500,
  backgroundColor: "#111111",
  scene: [MapScene, GatherScene, RefineScene, CraftScene, MarketScene, GlobalMarketScene, TradeMapScene, CrewScene],
});

// Dev-only debug hook -- lets the running game be inspected/driven from
// the console (canvas rendering means there's no DOM to query otherwise).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
