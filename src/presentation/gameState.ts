import { createLocalStorageSaveSystem } from "../adapters/saveSystem.ts";
import type { SaveSystem } from "../adapters/saveSystem.ts";
import { createWebAudioManager } from "../adapters/audioManager.ts";
import type { AudioManager } from "../adapters/audioManager.ts";
import { loadMvpContent } from "./loadMvpContent.ts";
import type { LoadedContent } from "../simulation/loadContent.ts";
import { createEmptyInventory } from "./inventory.ts";
import type { Inventory } from "./inventory.ts";

// Cross-scene state, created once. All persistence goes through
// SaveSystem exclusively (GDD Section 4 / this agent's Must-NOT-Do).
const INVENTORY_SAVE_KEY = "profitable:inventory";

export const content: LoadedContent = loadMvpContent();
export const saveSystem: SaveSystem = createLocalStorageSaveSystem();

// No sound content/asset ids are defined anywhere in the GDD or content/
// for this MVP, so the registry starts empty -- AudioManager is wired up
// and available (never bypassed), just not exercised with fake sounds.
export const audioManager: AudioManager = createWebAudioManager({});

let inventory: Inventory =
  (saveSystem.load(INVENTORY_SAVE_KEY) as Inventory | null) ?? createEmptyInventory();

export function getInventory(): Inventory {
  return inventory;
}

export function setInventory(next: Inventory): void {
  inventory = next;
  saveSystem.save(INVENTORY_SAVE_KEY, inventory);
}
