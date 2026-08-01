namespace Profitable.Core.Adapters;

// Ports src/adapters/saveSystem.ts's SaveSystem interface. `object?`
// (not a generic Save<T>/Load<T>) deliberately mirrors TypeScript's
// `unknown`-in/`unknown`-out contract -- the caller casts/interprets the
// loaded value, same as every current TypeScript call site already does
// (e.g. debugFlag.ts's `saveSystem.load(...) as boolean | null`).
public interface ISaveSystem
{
    void Save(string key, object? data);
    object? Load(string key);
}
