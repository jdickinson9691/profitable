import { createLocalStorageSaveSystem } from "../adapters/saveSystem.ts";
import type { SaveSystem } from "../adapters/saveSystem.ts";
import { createElectronFileSaveSystem, isElectronSaveApiAvailable } from "../adapters/electronSaveSystem.ts";
import { createWebAudioManager } from "../adapters/audioManager.ts";
import type { AudioManager } from "../adapters/audioManager.ts";
import { loadMvpContent } from "./loadMvpContent.ts";
import type { LoadedContent } from "../simulation/loadContent.ts";
import { createEmptyInventory } from "./inventory.ts";
import type { Inventory } from "./inventory.ts";

// Cross-scene state, created once. All persistence goes through
// SaveSystem exclusively (GDD Section 4 / this agent's Must-NOT-Do).
const INVENTORY_SAVE_KEY = "profitable:inventory";
const AUDIO_ENABLED_SAVE_KEY = "profitable:audioEnabled";

export const content: LoadedContent = loadMvpContent();

// Electron packaging (Alpha Section 5): uses the file-system-backed
// SaveSystem when running inside the packaged/dev Electron app
// (window.electronSaveAPI present, wired by electron/preload.cjs),
// falling back to createLocalStorageSaveSystem() otherwise (plain browser
// tab, npm run dev) -- exactly the swap the adapter pattern was built for;
// no other file in the game changes. FORCE_LOCAL_STORAGE_SAVE_SYSTEM is
// the alpha-testing escape hatch profitable-alpha-electron-plan.md §2
// itself recommends -- flip to true to force the browser-storage backend
// even inside Electron, if the file-system path needs a quick fallback.
// Remove once that path is confirmed solid.
const FORCE_LOCAL_STORAGE_SAVE_SYSTEM = false;
export const saveSystem: SaveSystem =
  !FORCE_LOCAL_STORAGE_SAVE_SYSTEM && isElectronSaveApiAvailable()
    ? createElectronFileSaveSystem()
    : createLocalStorageSaveSystem();

// No sound content/asset ids are defined anywhere in the GDD or content/
// for this MVP, so the registry starts empty -- AudioManager is wired up
// and available (never bypassed), just not exercised with fake sounds.
// Alpha Section 4 settings screen: the on/off toggle's persisted state is
// applied here, at construction, the same "load once, keep in sync via a
// setter" pattern every other cross-scene state module already uses.
const savedAudioEnabled = (saveSystem.load(AUDIO_ENABLED_SAVE_KEY) as boolean | null) ?? true;
export const audioManager: AudioManager = createWebAudioManager({}, savedAudioEnabled);

export function setAudioEnabled(enabled: boolean): void {
  audioManager.setEnabled(enabled);
  saveSystem.save(AUDIO_ENABLED_SAVE_KEY, enabled);
}

let inventory: Inventory =
  (saveSystem.load(INVENTORY_SAVE_KEY) as Inventory | null) ?? createEmptyInventory();

export function getInventory(): Inventory {
  return inventory;
}

export function setInventory(next: Inventory): void {
  inventory = next;
  saveSystem.save(INVENTORY_SAVE_KEY, inventory);
}
