import type { SaveSystem } from "./saveSystem.ts";

// Electron packaging (Alpha Section 5, profitable-alpha-electron-plan.md
// §2): "Swap SaveSystem's implementation from localStorage to Electron's
// file-system access... no call site anywhere in the game needs to
// change, only the one file implementing the SaveSystem interface." This
// is that swap's renderer-side half -- electron/preload.cjs bridges
// window.electronSaveAPI in, backed by synchronous IPC to electron/main.cjs,
// which reads/writes a single JSON file in the app's userData directory.
//
// Deliberately mirrors createLocalStorageSaveSystem()'s own shape exactly
// (same StorageLike-style injectability, same synchronous save/load
// contract) so gameState.ts's choice between the two is a one-line swap,
// not a rewrite.
export interface ElectronSaveAPI {
  save(key: string, data: unknown): void;
  load(key: string): unknown;
}

declare global {
  interface Window {
    electronSaveAPI?: ElectronSaveAPI;
  }
}

// gameState.ts checks this before choosing this adapter -- true only
// inside the packaged/dev Electron app (preload.cjs successfully attached
// contextBridge), false in a plain browser tab or npm run dev, where it
// correctly falls back to createLocalStorageSaveSystem() instead.
export function isElectronSaveApiAvailable(): boolean {
  return typeof window !== "undefined" && window.electronSaveAPI !== undefined;
}

export function createElectronFileSaveSystem(
  api: ElectronSaveAPI | undefined = typeof window !== "undefined" ? window.electronSaveAPI : undefined,
): SaveSystem {
  if (!api) {
    throw new Error(
      "createElectronFileSaveSystem: window.electronSaveAPI is not available -- not running inside the packaged Electron app, or preload.cjs failed to attach. Check isElectronSaveApiAvailable() before calling this.",
    );
  }
  return {
    save(key, data) {
      api.save(key, data);
    },
    load(key) {
      const value = api.load(key);
      return value === undefined ? null : value;
    },
  };
}
