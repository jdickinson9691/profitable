import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { renderTierSelector } from "./tierSelector.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { consume, addBatch, totalQuantity } from "../inventory.ts";
import { refine } from "../../simulation/refine.ts";
import { formatQualityRoll, formatQualityLabel, describeRefineResult } from "../display.ts";
import type { TierColor } from "../../data/types/tierColor.ts";
import type { ResourceInstance } from "../../data/types/resourceInstance.ts";

export class RefineScene extends Phaser.Scene {
  private selectedTier: TierColor = "Grey";
  private statusText?: Phaser.GameObjects.Text;
  private resultText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.refine);
  }

  create(): void {
    renderNav(this, SCENE_KEYS.refine);

    const recipe = content.refiningRecipes[0];

    this.add.text(16, 64, `Refine — ${recipe?.name ?? "Radiant Alloy Bar"}`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });

    this.statusText = this.add.text(16, 110, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cccccc",
    });

    this.add.text(16, 220, "Refiner tier:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    renderTierSelector(this, 16, 240, this.selectedTier, (tier) => {
      this.selectedTier = tier;
      this.scene.restart();
    });

    const refineButton = this.add.text(16, 270, "> Refine", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#4caf50",
    });
    refineButton.setInteractive({ useHandCursor: true });
    refineButton.on("pointerdown", () => this.doRefine());

    this.resultText = this.add.text(16, 310, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });

    this.refreshStatus();
  }

  private hasEnoughInputs(): boolean {
    const recipe = content.refiningRecipes[0];
    if (!recipe) return false;
    const inventory = getInventory();
    return recipe.inputs.every(
      (input) => totalQuantity(inventory, input.resourceId) >= input.quantity,
    );
  }

  private refreshStatus(): void {
    const recipe = content.refiningRecipes[0];
    if (!recipe) {
      this.statusText?.setText("No refining recipe loaded.");
      return;
    }
    const inventory = getInventory();
    const lines = recipe.inputs.map((input) => {
      const resource = content.resources.find((r) => r.id === input.resourceId);
      const have = totalQuantity(inventory, input.resourceId);
      return `${resource?.name ?? input.resourceId}: ${have} / ${input.quantity} needed`;
    });
    this.statusText?.setText(["Requires:", ...lines]);
  }

  private doRefine(): void {
    const recipe = content.refiningRecipes[0];
    if (!recipe || !this.hasEnoughInputs()) {
      this.resultText?.setText("Not enough materials gathered yet.");
      return;
    }

    let inventory = getInventory();
    const inputs: ResourceInstance[] = [];
    for (const requiredInput of recipe.inputs) {
      const { inventory: remaining, consumed } = consume(
        inventory,
        requiredInput.resourceId,
        requiredInput.quantity,
      );
      inventory = remaining;
      const resource = content.resources.find((r) => r.id === requiredInput.resourceId);
      if (!resource) continue;
      for (const batch of consumed) {
        inputs.push({ resource, quantity: batch.quantity, qualities: batch.qualities });
      }
    }

    const result = refine(inputs, this.selectedTier);

    // result.refundUnits isn't credited back to inventory: refine()'s own
    // contract rolls refund per *total* consumed unit without tracking
    // which specific input resource each unit belonged to (a mixed
    // ore+crystal refine's refund could be either), so there's no correct
    // resource to credit it to. The refund is still shown to the player
    // via describeRefineResult() below -- just not represented as
    // spendable inventory.
    const outputResource = content.resources.find((r) => r.id === recipe.outputResourceId);
    inventory = addBatch(inventory, {
      resourceId: recipe.outputResourceId,
      quantity: recipe.outputQuantity,
      qualities: result.qualities,
    });
    setInventory(inventory);

    const lines = formatQualityRoll(result.qualities).map(formatQualityLabel);
    this.resultText?.setText([
      `Refined 1x ${outputResource?.name ?? recipe.outputResourceId}:`,
      describeRefineResult(result),
      ...lines,
    ]);

    this.refreshStatus();
  }
}
