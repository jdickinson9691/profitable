export interface SaveSystem {
  save(key: string, data: unknown): void;
  load(key: string): unknown | null;
}

// Minimal shape of the DOM Storage API (localStorage/sessionStorage) --
// letting the backend be injected (rather than reaching for the global
// directly) means tests can supply an in-memory fake instead of needing a
// real browser or Node's experimental, file-backed localStorage. This file
// deliberately avoids depending on lib.dom's ambient `Storage`/`localStorage`
// types, so nothing here (or anywhere outside this agent's files) gets DOM
// globals visible to the type checker.
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createLocalStorageSaveSystem(
  storage: StorageLike = (globalThis as { localStorage: StorageLike }).localStorage,
): SaveSystem {
  return {
    save(key, data) {
      storage.setItem(key, JSON.stringify(data));
    },
    load(key) {
      const raw = storage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    },
  };
}
