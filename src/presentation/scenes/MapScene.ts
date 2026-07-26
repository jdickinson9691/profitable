import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { startingPlanet } from "../galaxyState.ts";

export class MapScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.map);
  }

  create(): void {
    renderNav(this, SCENE_KEYS.map);

    this.add.text(16, 64, "Profitable — MVP", {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#ffffff",
    });

    this.add.text(16, 110, startingPlanet.name, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffd700",
    });

    const landButton = this.add.text(16, 150, `> Land on ${startingPlanet.name}`, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#4caf50",
    });
    landButton.setInteractive({ useHandCursor: true });
    landButton.on("pointerdown", () => this.scene.start(SCENE_KEYS.gather));
  }
}
