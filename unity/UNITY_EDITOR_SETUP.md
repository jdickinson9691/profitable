# Unity Editor Setup — Step-by-Step

For the human doing the interactive parts (Unity Hub install, account login, license acceptance, Editor download) that Claude can't complete unattended. Once you're done, hand the session back with what Step 6 asks for and Agent 35 (Unity MVP Presentation) can start.

**Why this is needed:** Migration Phase 1 (`docs/profitable-unity-migration-gdd.md`) has stayed Unity-Editor-free through Agents 31-34 — everything so far builds and tests via plain `dotnet build`/`dotnet test` (see `unity/README.md`). Agent 35 is the first agent that needs a real Unity project to build scenes in.

---

## Step 1 — Install Unity Hub

Unity Hub manages Editor installs, licenses, and projects — you install it once, then use it for everything below.

```
winget install --id Unity.UnityHub -e
```

Or download directly from [unity.com/download](https://unity.com/download) if you'd rather not use winget.

Launch Unity Hub once it's installed to confirm it opens.

## Step 2 — Sign in / create a Unity ID

Unity Hub will prompt you to sign in. If you don't already have a Unity ID, choose **Create account** — it's free and only needs an email address.

## Step 3 — Activate a license

Still inside Unity Hub: **Preferences → Licenses → Add** (or you'll be prompted automatically on first sign-in). Choose **Unity Personal** unless you specifically have a Pro/Plus seat — Personal is free and has no feature restrictions relevant to this project. Accept the terms when prompted.

## Step 4 — Install an Editor version

In Unity Hub, go to the **Installs** tab → **Install Editor**.

- Pick any version marked **LTS** that's **2022.3** or newer (the exact patch version doesn't matter — `ProfitableCore` targets `.NET Standard 2.1`, which every current Unity version supports).
- When the module selection screen appears, you don't need to check any extra platform build-support modules (Android, iOS, WebGL, etc.) for now — the default desktop module is enough to build scenes and run them in the Editor. You can add build-target modules later if you want an actual packaged build.
- This step downloads several GB and can take 15-30+ minutes depending on your connection — a good point to step away.

## Step 5 — Create the project

In Unity Hub's **Projects** tab → **New project**.

- **Template:** pick **Core** in whatever category the Hub is showing you (a blank/minimal template — either 2D or 3D is fine for Phase 1's gather/refine/craft screens; it barely matters yet). Skip anything HDRP/URP-flavored — no need for advanced rendering here.
- **Project name:** `ProfitableUnity`
- **Location:** browse to `D:\Ludinn\Development\Profitable\unity\` and create the project there, so the final path is:
  ```
  D:\Ludinn\Development\Profitable\unity\ProfitableUnity\
  ```
  This keeps it as a sibling of the existing `unity\ProfitableCore\`, `unity\ProfitableCore.Tests\`, and `unity\parity\` folders — Unity's own `Library\`/`Logs\`/`Temp\` folders won't tangle with the dotnet `bin\`/`obj\` folders already there.
- Click **Create project** and wait for the Editor to open. First open takes a few minutes while Unity imports the default packages.

## Step 6 — Confirm it worked, then hand back

You should see the Unity Editor open with an empty Scene, and a `ProfitableUnity` folder should now exist at the path above containing `Assets\`, `Packages\`, `ProjectSettings\` (and, once the Editor's opened it, `Library\`).

When you're back in the session, just confirm:
- The Unity Editor opened successfully with no error dialogs.
- The project path (only needed if you put it somewhere other than the path above).
- The Unity version you installed (visible in the Editor's title bar, e.g. `ProfitableUnity - 2022.3.45f1`).

From there, Agent 35 picks up: building `ProfitableCore` into a DLL, dropping it into `Assets\Plugins\`, and building the gather/refine/craft scenes/scripts against it via Unity's batch-mode scripting, verified through real Editor/batch-mode runs rather than just written and assumed correct.

---

## If something goes wrong

- **Hub won't let you skip sign-in:** an account is required even for the free Personal license — there's no way around this step.
- **License activation fails / seat limit reached:** you may have hit Unity Personal's device/seat limit on your account; check [id.unity.com](https://id.unity.com) for your account's active seats and deactivate an old one if needed.
- **Editor install stalls or fails partway:** Unity Hub's installs are resumable — reopen the Installs tab and retry; no need to start over.
- **You created the project somewhere else, or with a different name:** that's fine, just tell me the actual path when you hand back — nothing above is hardcoded on my end yet.
