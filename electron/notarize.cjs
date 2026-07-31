// Electron packaging (Alpha Section 5, profitable-alpha-electron-plan.md
// §5): electron-builder's afterSign hook, invoked once per signed mac
// target. Notarization requires an actual Apple Developer account's
// credentials, which aren't available in every environment this build
// script might run in (a contributor's machine, CI without secrets
// configured) -- the plan scopes notarization in for "internal playtest
// distribution" specifically, not a hard requirement for every local
// build, so this skips (not fails) when credentials are absent rather
// than blocking `electron:build:mac` for anyone who hasn't set them up.
const { notarize } = require("@electron/notarize");

module.exports = async function notarizeMac(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log(
      "[notarize] Skipping notarization -- APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / " +
        "APPLE_TEAM_ID not set. Set all three (an app-specific password from " +
        "appleid.apple.com, not your Apple ID password) to notarize a build for " +
        "internal playtest distribution.",
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log(`[notarize] Submitting ${appName} for notarization -- this can take several minutes...`);

  await notarize({
    appPath: `${appOutDir}/${appName}.app`,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
    teamId: APPLE_TEAM_ID,
  });

  console.log(`[notarize] ${appName} notarized.`);
};
