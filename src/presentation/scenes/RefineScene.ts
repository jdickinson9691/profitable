import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { renderTierSelector } from "./tierSelector.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { consume, addBatch, totalQuantity } from "../inventory.ts";
import { refine } from "../../simulation/refine.ts";
import { formatQualityRoll, formatQualityLabel, describeRefineResult } from "../display.ts";
import type { TierColor } from "../../data/types/tierColor.ts";
import type { ResourceInstance } from "../../data/types/resourceInstance.ts";

const RECIPE_LIST_COLUMN_WIDTH = 380;
const RECIPE_LIST_ROW_HEIGHT = 18;

export class RefineScene extends Phaser.Scene {
  private selectedTier: TierColor = "Grey";
  // Presentation-layer selector only -- refine() itself takes no recipe
  // parameter, so this never touches simulation logic, only which
  // RefiningRecipe's inputs/output this scene reads. Defaults to the
  // first recipe, matching this scene's previous hardcoded behavior.
  private selectedRecipeId: string = content.refiningRecipes[0]?.id ?? "";
  private statusText?: Phaser.GameObjects.Text;
  private resultText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.refine);
  }

  private getSelectedRecipe() {
    return content.refiningRecipes.find((r) => r.id === this.selectedRecipeId) ?? content.refiningRecipes[0];
  }

  create(): void {
    renderNav(this, SCENE_KEYS.refine);

    this.add.text(16, 64, "Refine", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
    });

    this.add.text(16, 96, "Recipe:", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
    });
    let y = this.renderRecipeList(112) + 8;

    this.statusText = this.add.text(16, y, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cccccc",
    });
    y += 60;

    this.add.text(16, y, "Refiner tier:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 20;
    renderTierSelector(this, 16, y, this.selectedTier, (tier) => {
      this.selectedTier = tier;
      this.scene.restart();
    });
    y += 30;

    const refineButton = this.add.text(16, y, "> Refine", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#4caf50",
    });
    refineButton.setInteractive({ useHandCursor: true });
    refineButton.on("pointerdown", () => this.doRefine());
    y += 40;

    this.resultText = this.add.text(16, y, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });

    this.refreshStatus();
  }

  // Lists every one of the alpha roster's 10 refining recipes (previously
  // only content.refiningRecipes[0] was ever reachable) -- same "list all,
  // let the player choose" shape ShipAssemblyScene.findRecipesForCategory()
  // already established, laid out as a 2-column grid so 10 entries fit
  // comfortably within the scene's fixed 800x500 canvas.
  private renderRecipeList(startY: number): number {
    let maxRow = 0;
    content.refiningRecipes.forEach((recipe, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      maxRow = Math.max(maxRow, row);
      const isSelected = recipe.id === this.selectedRecipeId;
      const label = this.add.text(
        16 + col * RECIPE_LIST_COLUMN_WIDTH,
        startY + row * RECIPE_LIST_ROW_HEIGHT,
        isSelected ? `[${recipe.name}]` : recipe.name,
        {
          fontFamily: "monospace",
          fontSize: "13px",
          color: isSelected ? "#ffd700" : "#4caf50",
        },
      );
      if (!isSelected) {
        label.setInteractive({ useHandCursor: true });
        label.on("pointerdown", () => {
          this.selectedRecipeId = recipe.id;
          this.scene.restart();
        });
      }
    });
    return startY + (maxRow + 1) * RECIPE_LIST_ROW_HEIGHT;
  }

  private hasEnoughInputs(): boolean {
    const recipe = this.getSelectedRecipe();
    if (!recipe) return false;
    const inventory = getInventory();
    return recipe.inputs.every(
      (input) => totalQuantity(inventory, input.resourceId) >= input.quantity,
    );
  }

  private refreshStatus(): void {
    const recipe = this.getSelectedRecipe();
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
    this.statusText?.setText([`Requires (${recipe.name}):`, ...lines]);
  }

  private doRefine(): void {
    const recipe = this.getSelectedRecipe();
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
