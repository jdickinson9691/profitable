namespace Profitable.Core.Schema;

// Ports src/data/types/random.ts. Necessary completion (see
// agent-32-unity-simulation-core.md's Outputs Section 1): not one of
// Agent 31's MVP-scope types, but a hard dependency of every simulation
// function that needs to be deterministic/testable instead of relying on
// statistical assertions.
public delegate double RandomFn();
