# Fixtures

Copies of the real `content/*.json` files (`resources.json`, `recipes.json`, `refiningRecipes.json`, `schematics.json`, `planets.json`) as of the commit that added Agent 31 (Unity Data Schema). Not synthetic test data — this is the actual current alpha content roster, copied so `ContentLoader`'s real-file integration tests don't depend on a relative path back into the TypeScript project.

If the real `content/*.json` files change, re-copy them here and re-run `ContentLoaderRealFilesTests` — a stale fixture would silently stop proving anything about the current content.
