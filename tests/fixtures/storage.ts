import type { StorageLike } from "../../src/adapters/saveSystem.ts";

// In-memory stand-in for localStorage, so tests don't need a real browser
// or Node's experimental, file-backed localStorage.
export function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}
