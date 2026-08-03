import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { renderTierSelector } from "./tierSelector.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { consume, addBatch, totalQuantity } from "../inventory.ts";
import type { InventoryBatch } from "../inventory.ts";
import { craft } from "../../simulation/craft.ts";
import { resolveSchematicTier } from "../../simulation/schematicTier.ts";
import { getShipsContent, getShipRoster } from "../shipsState.ts";
import { getCrewRoster } from "../crewState.ts";
import { formatQualityRoll, formatQualityLabel, describeCraftResult } from "../display.ts";
import { renderOnboardingStep } from "./onboardingOverlay.ts";
import { ARTISAN_MATERIAL_DISCOUNT_BY_TIER } from "../../data/constants/shipsAndTravelConfig.ts";
import type { TierColor } from "../../data/types/tierColor.ts";
import type { ResourceInstance } from "../../data/types/resourceInstance.ts";
import type { Resource } from "../../data/types/resource.ts";
import type { Recipe } from "../../data/types/recipe.ts";

const RECIPE_LIST_COLUMN_WIDTH = 380;
const RECIPE_LIST_ROW_HEIGHT = 18;

export class CraftScene extends Phaser.Scene {
  private selectedCrafterTier: TierColor = "Grey";
  // Presentation-layer selector only, same shape as RefineScene's own.
  // Defaults to the first general recipe, matching this scene's previous
  // hardcoded behavior.
  private selectedRecipeId: string = CraftScene.generalRecipes()[0]?.id ?? "";
  private statusText?: Phaser.GameObjects.Text;
  private resultText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.craft);
  }

  // Ship component recipes (the 16 linked via content/componentRecipes.json)
  // are ShipAssemblyScene's exclusive domain -- it already lists all 4 per
  // category there. This scene covers the alpha roster's remaining 13
  // general crafting recipes, so the two scenes never offer the same recipe
  // through two different craft paths.
  private static generalRecipes(): Recipe[] {
    const componentRecipeIds = new Set(getShipsContent().componentRecipes.map((link) => link.recipeId));
    return content.recipes.filter((recipe) => !componentRecipeIds.has(recipe.id));
  }

  private getSelectedRecipe(): Recipe | undefined {
    const recipes = CraftScene.generalRecipes();
    return recipes.find((r) => r.id === this.selectedRecipeId) ?? recipes[0];
  }

  create(): void {
    renderNav(this, SCENE_KEYS.craft);

    this.add.text(16, 64, "Craft", {
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

    const recipe = this.getSelectedRecipe();
    const schematic = content.schematics.find((s) => s.recipeId === recipe?.id);
    const schematicTier = resolveSchematicTier(schematic);

    // Known-by-default recipes (docs/profitable-alpha-content-roster.md
    // §5) have no owned Schematic entity at all -- resolveSchematicTier()
    // resolves that to Grey (no bonus), not a blocked/error state.
    this.add.text(
      16,
      y,
      `Schematic tier: ${schematicTier}${schematic ? "" : " (no schematic owned -- Grey-equivalent, no bonus)"}`,
      {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffd700",
      },
    );
    y += 30;

    this.statusText = this.add.text(16, y, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#cccccc",
    });
    y += 70;

    this.add.text(16, y, "Crafter tier:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 20;
    renderTierSelector(this, 16, y, this.selectedCrafterTier, (tier) => {
      this.selectedCrafterTier = tier;
      this.scene.restart();
    });
    y += 30;

    const craftButton = this.add.text(16, y, "> Craft", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#4caf50",
    });
    craftButton.setInteractive({ useHandCursor: true });
    craftButton.on("pointerdown", () => this.doCraft());
    y += 40;

    this.resultText = this.add.text(16, y, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });

    this.refreshStatus();

    renderOnboardingStep(
      this,
      "Craft",
      "Choose a recipe from the list below, pick a crafter tier, then click \"> Craft\" to turn refined materials into a finished good.",
      () => this.scene.restart(),
    );
  }

  // Same 2-column grid RefineScene.renderRecipeList() already established,
  // sized for the alpha roster's 13 general crafting recipes.
  private renderRecipeList(startY: number): number {
    const recipes = CraftScene.generalRecipes();
    let maxRow = 0;
    recipes.forEach((recipe, index) => {
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

  // Crafting recipes are category-based, not resource-id-based (GDD:
  // "not fixed to specific materials"). The MVP content only ever has one
  // resource per relevant category, so resolving the first match is a
  // reasonable presentation-layer simplification for this content -- it's
  // inventory/UI bookkeeping, not part of craft()'s own formula.
  private resolveSlotResource(category: string): Resource | undefined {
    return content.resources.find((resource) => resource.category === category);
  }

  // Ship Crew Roles amendment: an Artisan assigned as the active ship's
  // Crafter discounts general-recipe input quantities, applied entirely
  // upstream of craft() -- craft() itself is never touched (design entry's
  // own "no new parameter, no crew read anywhere in src/simulation/craft.ts"
  // rule). "The active ship" reuses TradeMapScene's own single-player
  // convention (getShipRoster()[0]) -- there is no separate concept of
  // "the ship the player is currently crafting from" anywhere else in this
  // codebase to hang this off of instead.
  private getArtisanDiscountPercent(): number {
    const ship = getShipRoster()[0];
    if (!ship) return 0;
    const artisan = getCrewRoster().find(
      (member) => member.assignedShipId === ship.id && member.shipRole === "Crafter" && member.profession === "Artisan",
    );
    if (!artisan) return 0;
    return ARTISAN_MATERIAL_DISCOUNT_BY_TIER.find((e) => e.tier === artisan.tier)?.discountPercent ?? 0;
  }

  // Fraction of a slot's required quantity waived, rounded down, never
  // below 1 unit required -- exactly ARTISAN_MATERIAL_DISCOUNT_BY_TIER's
  // own documented rule.
  private effectiveSlotQuantity(baseQuantity: number): number {
    const discount = this.getArtisanDiscountPercent();
    if (discount <= 0) return baseQuantity;
    return Math.max(1, Math.floor(baseQuantity * (1 - discount)));
  }

  private hasEnoughInputs(): boolean {
    const recipe = this.getSelectedRecipe();
    if (!recipe) return false;
    const inventory = getInventory();
    return recipe.inputs.every((slot) => {
      const resource = this.resolveSlotResource(slot.category);
      return resource !== undefined && totalQuantity(inventory, resource.id) >= this.effectiveSlotQuantity(slot.quantity);
    });
  }

  private refreshStatus(): void {
    const recipe = this.getSelectedRecipe();
    if (!recipe) {
      this.statusText?.setText("No crafting recipe loaded.");
      return;
    }
    const inventory = getInventory();
    const lines = recipe.inputs.map((slot) => {
      const resource = this.resolveSlotResource(slot.category);
      const have = resource ? totalQuantity(inventory, resource.id) : 0;
      return `${resource?.name ?? slot.category}: ${have} / ${this.effectiveSlotQuantity(slot.quantity)} needed`;
    });
    const craftedCount = totalQuantity(inventory, recipe.outputResourceId);
    this.statusText?.setText([`Requires (${recipe.name}):`, ...lines, `Already crafted: ${craftedCount}`]);
  }

  private doCraft(): void {
    const recipe = this.getSelectedRecipe();
    const schematic = content.schematics.find((s) => s.recipeId === recipe?.id);
    // A missing schematic is not a blocking condition -- known-by-default
    // recipes have none by design (resolveSchematicTier() resolves that
    // to Grey, the correct no-bonus default). Only missing inputs/recipe
    // actually block a craft attempt.
    if (!recipe || !this.hasEnoughInputs()) {
      this.resultText?.setText("Not enough materials gathered/refined yet.");
      return;
    }
    const schematicTier = resolveSchematicTier(schematic);

    let inventory = getInventory();
    const inputs: ResourceInstance[] = [];
    const consumedBySlot: InventoryBatch[][] = [];

    for (const slot of recipe.inputs) {
      const resource = this.resolveSlotResource(slot.category);
      if (!resource) continue;
      const { inventory: remaining, consumed } = consume(inventory, resource.id, this.effectiveSlotQuantity(slot.quantity));
      inventory = remaining;
      consumedBySlot.push(consumed);
      for (const batch of consumed) {
        inputs.push({ resource, quantity: batch.quantity, qualities: batch.qualities });
      }
    }

    const result = craft(inputs, recipe, schematicTier, this.selectedCrafterTier);

    if (!result.accepted) {
      // A rejected craft never happened -- give the consumed materials
      // back rather than silently destroying them.
      for (const batches of consumedBySlot) {
        for (const batch of batches) {
          inventory = addBatch(inventory, batch);
        }
      }
      setInventory(inventory);
      this.resultText?.setText(describeCraftResult(result));
      this.refreshStatus();
      return;
    }

    const outputResource = content.resources.find((r) => r.id === recipe.outputResourceId);
    inventory = addBatch(inventory, {
      resourceId: recipe.outputResourceId,
      quantity: recipe.outputQuantity,
      qualities: result.qualities,
    });
    setInventory(inventory);

    const lines = formatQualityRoll(result.qualities).map(formatQualityLabel);
    this.resultText?.setText([
      `Crafted 1x ${outputResource?.name ?? recipe.outputResourceId}:`,
      describeCraftResult(result),
      ...lines,
    ]);

    this.refreshStatus();
  }
}
