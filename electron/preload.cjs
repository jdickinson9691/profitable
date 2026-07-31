// Electron packaging (Alpha Section 5, profitable-alpha-electron-plan.md
// §1/§2). Runs in an isolated world with Node integration available (this
// file only), bridging exactly one thing into the renderer's page context:
// window.electronSaveAPI, backing src/adapters/electronSaveSystem.ts.
// contextIsolation stays on (main.cjs) and nodeIntegration stays off in the
// renderer -- the game itself never gets direct Node/fs access, only this
// narrow save/load surface, same "isolate behind one swappable adapter"
// principle CLAUDE.md already establishes for SaveSystem/AudioManager.
//
// Uses ipcRenderer.sendSync deliberately: SaveSystem's interface
// (save/load) is synchronous everywhere it's called throughout the
// presentation layer (~10 call sites), and preserving that contract means
// zero changes to any of those call sites -- only the one adapter
// implementation differs. sendSync blocks the renderer until main.cjs
// responds, which is fine here: saves are infrequent, user-triggered
// actions (buy, sell, hire, etc.), never a per-frame hot path.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronSaveAPI", {
  save(key, data) {
    ipcRenderer.sendSync("save-system:save", key, data);
  },
  load(key) {
    return ipcRenderer.sendSync("save-system:load", key);
  },
});
