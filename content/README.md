# content

Owned by the **Content Agent** (GDD §5.2, agent 6).

JSON config data — not code — defining the actual MVP content (GDD §3.4):
2–3 resource type definitions, one refining recipe, one crafting recipe +
schematic. Must validate against the schemas in `src/data/schemas`, and must
be rich enough to exercise every branch of the formulas (e.g. at least one
resource with a null/NA quality, at least one craft input that can fall
below the recipe's threshold).

This directory is data-only. The Content Agent should not need to touch any
TypeScript file.

Nothing has been defined here yet.
