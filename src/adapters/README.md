# src/adapters

Owned by the **Infrastructure/Adapter Agent** (GDD §5.2, agent 4).

The browser-API isolation layer mandated by GDD §4: `SaveSystem` and
`AudioManager` interfaces, each with one concrete browser-backed
implementation. No other module anywhere in the codebase may call
`localStorage`/`Audio()` directly — it goes through one of these two
interfaces instead.

No gameplay logic, and no imports from `src/simulation`.

Nothing has been implemented here yet.
