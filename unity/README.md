# unity/

C# side of the Unity Migration (`docs/profitable-unity-migration-gdd.md`). New, additive work in a separate project — does not modify the existing TypeScript/Phaser/Electron build (`src/`, `content/`, etc.), which stays live and deployable throughout the migration.

**No Unity Editor here yet.** Through Migration Phase 1 Agent 31 (Unity Data Schema), this is a plain .NET solution — builds and tests via `dotnet build`/`dotnet test` alone, no Unity install required. Unity Editor dependency begins at Agent 35 (Unity MVP Presentation); at that point a real Unity project (with its own `Assets/`, `ProjectSettings/`, `Packages/`) will be added here, referencing or embedding `ProfitableCore`.

## Structure

- `ProfitableUnityMigration.sln` — solution file.
- `ProfitableCore/` — class library (targets `netstandard2.1` for future Unity scripting-runtime compatibility). Ported schema types, constant tables, and `ContentLoader` — see `docs/agents/agent-31-unity-data-schema.md` for the full contract.
- `ProfitableCore.Tests/` — xUnit test project (`net8.0`). `Fixtures/` holds copies of the real `content/*.json` files, used to prove `ContentLoader` parses actual current content, not synthetic data — see that folder's own README for the re-copy-when-stale caveat.

## Running

```
cd unity
dotnet build
dotnet test
```

## Agent roster

Full roster and sequencing: `docs/profitable-unity-migration-gdd.md` Section 5.1. Contracts live in `docs/agents/agent-31-unity-data-schema.md` through `agent-36-unity-migration-phase1-integration.md` (written as each agent starts, same "contract before code" discipline as every other milestone in this project).
