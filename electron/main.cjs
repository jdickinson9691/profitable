// Electron packaging (Alpha Section 5, profitable-alpha-electron-plan.md).
// Wraps the existing Vite/Phaser build unchanged -- BrowserWindow just
// loads the same built output (dist/index.html) that already runs in a
// browser tab, or the Vite dev server URL during `npm run electron:dev`.
// No game code lives here or is duplicated here.
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

// Set via the electron:dev script (concurrently starts Vite, then this),
// so a plain packaged/production launch never depends on a dev server
// being reachable.
const DEV_SERVER_URL = process.env.ELECTRON_START_URL;

// --- SaveSystem file-system backend -----------------------------------
// Single JSON file in the app's userData directory, keyed the same way
// localStorage was (one flat namespace of string keys -> arbitrary JSON
// values) -- see src/adapters/electronSaveSystem.ts for the renderer-side
// half of this swap. Whole-file read/rewrite per call is deliberately
// simple: saves are infrequent, user-triggered actions, not a hot path.
function getSaveFilePath() {
  return path.join(app.getPath("userData"), "profitable-save.json");
}

function readSaveFile() {
  try {
    const raw = fs.readFileSync(getSaveFilePath(), "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    // A corrupt/unreadable save file shouldn't crash the app -- start
    // fresh, same "no data" contract SaveSystem.load() already has for a
    // missing localStorage key.
    console.error("[SaveSystem] failed to read save file, starting fresh:", err);
    return {};
  }
}

function writeSaveFile(data) {
  fs.mkdirSync(path.dirname(getSaveFilePath()), { recursive: true });
  fs.writeFileSync(getSaveFilePath(), JSON.stringify(data), "utf-8");
}

ipcMain.on("save-system:save", (event, key, value) => {
  const data = readSaveFile();
  data[key] = value;
  writeSaveFile(data);
  event.returnValue = undefined;
});

ipcMain.on("save-system:load", (event, key) => {
  const data = readSaveFile();
  event.returnValue = Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
});

// --- Window + menu -------------------------------------------------------

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 500,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: "#111111",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
}

// Alpha Section 4's debug/tuning panel is gated by isDebugModeEnabled()
// (src/presentation/debugFlag.ts), which in a packaged build reads this
// same key through the game's own saveSystem (never localStorage
// directly -- there's no address bar to put a ?debug=1 URL param on
// anyway) -- this menu item is the only way to flip it. Writes through
// window.electronSaveAPI (the exact bridge saveSystem itself resolves to
// inside Electron -- see src/adapters/electronSaveSystem.ts), not raw
// localStorage, so this stays consistent regardless of which SaveSystem
// backend is actually active. Runs entirely inside the already-loaded
// page via executeJavaScript rather than a full preload/IPC round trip
// of its own, then reloads so main.ts's boot-time isDebugModeEnabled()
// check re-runs and picks up the new value -- same "toggle, then reload
// to apply" shape the debug/tuning panel's own scene.restart() calls
// already use elsewhere in this codebase.
const DEBUG_MODE_SAVE_KEY = "profitable:debugModeEnabled";

function toggleDebugMode(browserWindow) {
  if (!browserWindow) return;
  browserWindow.webContents.executeJavaScript(`
    (function() {
      var key = ${JSON.stringify(DEBUG_MODE_SAVE_KEY)};
      if (!window.electronSaveAPI) {
        console.error("[Toggle Debug Mode] window.electronSaveAPI is unavailable -- preload.cjs did not attach.");
        return;
      }
      var current = window.electronSaveAPI.load(key) === true;
      window.electronSaveAPI.save(key, !current);
      location.reload();
    })();
  `);
}

function buildMenu(mainWindow) {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow.webContents.reload(),
        },
        {
          label: "Toggle Debug Mode",
          accelerator: "CmdOrCtrl+Shift+D",
          click: () => toggleDebugMode(mainWindow),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  const win = createWindow();
  buildMenu(win);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow();
      buildMenu(newWin);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
