import Phaser from "phaser";
// Must stay the first local import, ahead of every scene below -- see
// devGalaxySeed.ts's own comment for why its import-order position is
// load-bearing, not stylistic (galaxyState.ts's galaxy is generated once,
// at first import, with no setter to redo it later).
import "./devGalaxySeed.ts";
import { MapScene } from "./scenes/MapScene.ts";
import { GatherScene } from "./scenes/GatherScene.ts";
import { RefineScene } from "./scenes/RefineScene.ts";
import { CraftScene } from "./scenes/CraftScene.ts";
import { MarketScene } from "./scenes/MarketScene.ts";
import { GlobalMarketScene } from "./scenes/GlobalMarketScene.ts";
import { TradeMapScene } from "./scenes/TradeMapScene.ts";
import { CrewScene } from "./scenes/CrewScene.ts";
import { ShipyardScene } from "./scenes/ShipyardScene.ts";
import { ShipAssemblyScene } from "./scenes/ShipAssemblyScene.ts";
import { isDebugModeEnabled } from "./debugFlag.ts";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 500,
  backgroundColor: "#111111",
  scene: [
    MapScene,
    GatherScene,
    RefineScene,
    CraftScene,
    MarketScene,
    GlobalMarketScene,
    TradeMapScene,
    CrewScene,
    ShipyardScene,
    ShipAssemblyScene,
  ],
});

// Dev-only debug hook -- lets the running game be inspected/driven from
// the console (canvas rendering means there's no DOM to query otherwise).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

// Dev-only playtest shortcut, gated behind isDebugModeEnabled() (dev
// build + ?debug=1) on top of the plain DEV check above -- not visible in
// a normal `npm run dev` session, never mind a production build. Only
// seeds state via existing setters/entity-creation functions; never
// wired into or replacing the real new-game/onboarding path. Callable
// from devtools: `__seedPlaytestSave()`.
if (isDebugModeEnabled()) {
  void import("./devSeed.ts").then(({ seedPlaytestSave }) => {
    (window as unknown as { __seedPlaytestSave: () => void }).__seedPlaytestSave = seedPlaytestSave;
  });
}
