import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Electron packaging (Alpha Section 5): Electron's BrowserWindow loads
  // dist/index.html via a file:// URL, not an http server. Vite's default
  // base ("/") emits root-relative asset paths (e.g. /assets/index-*.js),
  // which resolve against the *drive* root under file:// (browsers treat
  // a leading "/" as filesystem-absolute there), not against dist/ --
  // assets 404 and the app never boots. "./" emits paths relative to
  // index.html itself, which resolves correctly under both file:// and
  // any real http server regardless of the subpath it's hosted at, so
  // this is a strict improvement, not a special case for one target.
  base: "./",
  build: {
    outDir: "dist",
  },
});
