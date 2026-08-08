# Profitable — TradeWars 2000/2002 Alignment Review

**Status: research and comparison, not a locked design pass.** Unlike every `profitable-design-questions.md` section, this document doesn't end in "Decided:" bullets — it's the factual basis for deciding, not the decision itself. TradeWars 2000 (and its long-lived successor TradeWars 2002, the version almost all surviving documentation actually describes — the two are used interchangeably below, as the source material does) is confirmed as this project's foundational gameplay-loop inspiration, with Profitable's own systems (5-quality items, refining/crafting formulas, tier-color scale, etc.) layered on top. This document compares TW2002's actual mechanics (researched via web search this session, sources at the bottom — not recalled from memory) against Profitable's current locked design, and flags where they align, where Profitable deliberately diverged already, where something is genuinely missing, and — most importantly — one place where the comparison surfaced a real, verified bug in the current build.

**How to use this doc:** each section ends with a status tag — **Aligned**, **Deliberate divergence** (already decided, don't reopen without a real reason), **Gap** (missing, plausibly worth adding), or **Conflict** (TW2002's approach runs directly against something Profitable already locked). The Open Questions section at the bottom is the actionable part.

---

## 1. Galaxy Structure: Sectors/Warps vs. 2D Coordinates

**TW2002:** A galaxy is 100-30,000 **sectors** connected by 1-6 **warps** (one-way or two-way) — formally a directed graph, not a coordinate space. "Distance" is graph hops, not geometry. Sectors hold planets, ports, ships, mines, fighters, beacons.

**Profitable:** `galaxy.md`/`planet.md` — 50 planets placed at real `{x, y}` coordinates in a bounded 2000×2000 square, connected by nothing (travel is point-to-point, any planet reachable from any other, distance is Euclidean). No graph, no warps, no "adjacent sector" concept at all.

**Status: Conflict, but likely a deliberate one already made, not newly discovered.** Phase 2's design-questions entry chose 2D coordinates specifically so distance/travel-time could be a clean geometric formula (`calculateDistance()`), and Section 2.7 explicitly locked "coordinates stay 2D" as a hard boundary multiple phases have since restated. A sector-graph model is a fundamentally different navigation paradigm (no "closer" or "farther," only "connected" or "not," and asymmetric one-way warps have no coordinate analog) — adopting it now would mean re-deriving Travel, Scanner, and the Map from scratch. Flagged as the largest structural gap between the two designs, not recommended for adoption, but named explicitly since "TW2000 is the basis" is now on record as the stated inspiration and a reader should know this specific piece was consciously not carried over.

## 2. Turns vs. Real-Time

**TW2002:** The defining resource of the entire game. Players get an allocated number of turns per day (server-configurable, commonly hundreds to a couple thousand); **every** action — moving a sector, trading, combat — consumes turns. "Trading efficiency" is explicitly defined as cargo holds ÷ turns-to-next-sector. Running out of turns stops play until the next day's allocation (or a real-money/wait mechanism on some servers).

**Profitable:** No discrete turn resource anywhere. Every timed system (voyages, crew wages, market drift, encounter windows, the new Planet Resource reset cycle) is real-time/timestamp-based with deterministic catch-up resolution — confirmed as a foundational architectural choice (Engine/Systems Architecture section: "background crafting... resolved via a deterministic catch-up calculation... not real-time ticking"), and reconfirmed as recently as this session's own Planet Resource Generation pass, where a literal "turns counter" request was deliberately implemented as an hours-based interval instead, matching this exact pattern.

**Status: Conflict, resolved as a deliberate non-adoption, not left dangling.** TW2002's entire economy is *organized around* turn scarcity (haggling costs a turn, so does every hop — the tension between "explore more" and "turns left" is the core tension of the game). **Decided: no turns-equivalent** — a session-limited resource that can outright stop play would contradict the real-time/catch-up architecture reaffirmed repeatedly across this project (Universe reporting, resource reset cycles, background crafting, Fuel itself). **Instead, Ship Fuel was retuned to carry that tension** (`profitable-design-questions.md`'s Ship Fuel section, "Amendment — Fuel Management"): capacity was cut roughly two-thirds at low tiers specifically so a real route-planning/refueling decision exists at Grey/White/Green, while Blue-tier-and-above ships keep the original "go anywhere in one hop" guarantee — the closest analog this architecture can support without becoming session-limited.

## 3. Trading & Ports

**TW2002:** Three commodities (Fuel Ore, Organics, Equipment). Ports are **NPC entities** — permanent, always there, always willing to buy or sell (each port has a fixed buy/sell combination out of 8 possible types). Prices drift with each trade but the port itself never runs out or disappears. **Haggling** is an interactive back-and-forth: the port has a hidden acceptable-price range that narrows the longer negotiation continues; skillful haggling earns experience points, and hitting a port's exact best price is a small, specific reward.

**Profitable:** `planetary-markets.md`/`galactic-market.md` — real drift/recovery/season/emergency pricing formulas exist, and they're sophisticated, but **there is no persistent NPC counterparty**. Every listing (planetary or global) is created by a specific `playerId`, and `purchaseListing()` hard-rejects self-trade (`buyerPlayerId === listing.createdByPlayerId`).

**Status: Gap, fixed and built.** In single-player mode there is exactly one `playerId` (`PLAYER_ID = "player-1"`, `src/presentation/tradingState.ts`). Any listing the player creates via `MarketScene`'s "Sell from inventory" action is created under that same id — which meant **the self-trade check permanently blocked the player from ever buying their own listing**, and nothing else in single-player mode *could* buy it either. The game had one hardcoded workaround for half of this: a `SEED_MARKET_PLAYER_ID = "seed-market"` constant seeds a handful of starter listings under a fake counterparty id specifically so there's *something* purchasable at game start, but nothing refreshed or replenished it — past `LISTING_EXPIRY_HOURS` (72h), solo trading had no counterparty left, ever. TW2002's port-as-permanent-NPC model is exactly the shape of the missing piece. **Fixed via `profitable-design-questions.md`'s "Trading Counterparty" section**: `sellToMarket()` (planetary, `src/trading/sellToMarket.ts`) and `sellToGlobalMarket()` (global, `src/trading/sellToGlobalMarket.ts`) — both listing-free instant sells at the market's live price, wired into `MarketScene`/`GlobalMarketScene` as `> Sell Now` actions, tested, full suite green with zero regressions.

## 4. Planets: Production, Colonists, Genesis Torpedoes, Citadels

**TW2002:** 7 planet classes (M/K/O/L/C/H/U) with different production *rates*, not different eligible categories — but a planet produces **nothing at all** until a player transports colonists there (starting from Terra). Players can **create new planets** by firing a Genesis Torpedo into an empty sector. Owned planets can be upgraded through 6 **Citadel** levels, unlocking defenses, remote scanning, and a safe place to dock/log off.

**Profitable:** `planet.md`/`planet-ownership.md` — planets are procedurally generated with tier/type/producible-resources/specialty already assigned; gathering (per Planet Resource Generation) reads a fixed quality. **Since this section was first written, two of the three gaps below were closed at the design level** (`planet-ownership.md`, found via this exact comparison) — this paragraph originally said planets are "never player-owned, never upgradable," which is no longer accurate as a design statement, only as a not-yet-built one.

**Status: two of the original three resolved at the design level (one, Citadels, subsequently built then retroactively cut from alpha scope), the third (Genesis Torpedoes) a deliberate non-adoption rather than an open gap.** What shipped, and what was declined and why:
- **Colonist-driven production — resolved at the design level and built; unaffected by the Citadels removal below.** A planet now requires `colonistCount >= MINIMUM_COLONISTS_TO_PRODUCE` (transported via a new `transportColonists()` action) before `getCurrentPlanetResources()` reports anything gatherable — the exact "where do I invest" decision this section originally called out as missing. **Decided differently than this section speculated**, worth noting: colonists ended up a new, simple concept (unskilled, transportable, no tier/wage/attrition) rather than extending `CrewMember` — deliberately *not* giving the Crew system a "second job," to avoid blurring what "crew" means everywhere else it's used.
- **Citadels / planet ownership — resolved at the design level, deliberately reshaped (not ported 1:1), fully built and tested, then retroactively cut from alpha scope (2026-08-04).** Had been built up through 3 levels (not TW2002's 6) providing repair/refuel-discount — infrastructure value, not defense; TW2002's Citadels are primarily a defensive structure against a PvP/invasion threat model Profitable has no analog of and wasn't adding one to build this against. The removal was a scope reduction for alpha content authoring, not a problem found with the mechanic or the reshaping decision itself — `planet-ownership.md`'s own retroactive-removal note has the full account.
- **Player-created planets (Genesis Torpedoes) — considered and declined, not left open.** Two reasons, weighed together: **(1) architectural cost.** TW2002's genesis torpedo fires into an empty sector-graph node; Profitable has no such concept — a player-created planet would break the one invariant everything else in this game relies on (`galaxy.md`'s "generated once, deterministic from seed, never persisted directly" rule), requiring yet another persisted side-table and invalidating every assumption built on `PLANET_COUNT` being fixed, including `universe.md`'s per-galaxy planet-count registry stat. **(2) thin payoff.** TW2002's version matters because corp/PvP territory control gives "place a planet exactly here" real strategic weight — Profitable has neither. With 50 planets already in place, "create a new planet" barely differs from "go colonize one of the 48 you haven't discovered yet." Not revisited unless the underlying motivation changes (e.g., Multiplayer eventually adds real territory contention) — this reasoning stands independently of the Citadels removal above, since it was never contingent on Citadels existing.

## 5. Ships: Fixed Classes vs. Component-Built

**TW2002:** Named ship *classes* (Merchant Cruiser, Colonial Transport, Corporate FlagShip, Imperial StarShip, Havoc GunStar, Interdictor Cruiser, etc.), each with fixed max-holds/max-fighters/max-shields/turns-per-warp stats. Upgrading means **buying a different ship**, not modifying the one you have. The best ships are gated behind alignment/reputation (a Federal Commission, 500+ alignment, for the Imperial StarShip).

**Profitable:** `ship.md`/`travel.md` — deliberately the opposite, and explicitly decided as such (`profitable-design-questions.md`, Ships section, "Option A — individual component swaps, each independently tiered... chosen because it honors the four component types as real, distinct subsystems... rather than every same-tier ship being identical"). One ship, four component slots, tier derived from what's installed.

**Status: Deliberate divergence, already decided, not reopened here.** Worth recording explicitly given the new "TW2000 is the basis" framing, precisely so a future reader doesn't mistake the absence of TW2002-style ship classes for an oversight — it's a considered choice with its own stated reasoning, made independently of this comparison.

## 6. Combat: Fighters/Shields/Mines vs. a Single Roll

**TW2002:** Fighters (deployed in a sector or aboard a ship) and shields are the actual combat resources, with different attack-odds tables depending on context (1:1 sector-offensive, 2:1 planetary-offensive, 3:1 planetary-defensive), a deterministic multi-party resolution order, and a distinct planet-invasion sequence (atmosphere cannon fire → shield-vs-ship combat → second cannon volley → fighter combat → claim). Mines (Limpet, Armid) are separate area-denial tools with their own detonation mechanics.

**Profitable:** `encounters-combat.md` — a single resolved roll (weapon-component-tier vs. a rolled opponent-threat-tier), win or lose, no multi-round resolution, no fighters/shields-as-resources, no mines.

**Status: Deliberate divergence, already decided.** Combat's own design-questions entry states this outright: "Resolution depth: shallow — a single resolved roll... Consistent with the whole project's grain toward formula-driven resolution over simulated systems." TW2002's combat is exactly the "simulated system" this was deliberately weighed against and declined. Recorded here for the same reason as Section 5 — a considered choice, not a gap to close.

## 7. Progression: Alignment, Bounties, Reputation

**TW2002:** A Good/Evil alignment scale (-100 to 500+) gates access to the best ships and to Federal space privileges; players can post credit bounties on evil players; experience points accrue from good trades and successful haggling.

**Profitable:** No reputation/alignment/bounty system anywhere. The closest adjacent concept is the newly-designed (unbuilt) Universe leaderboards (`universe.md`) — net worth, trading volume, highest crafted tier — which are pure performance metrics, not a behavioral/moral axis.

**Status: considered and declined, not left open.** TW2002's alignment is fundamentally about behavior *toward other players* in a shared, real-time world — attacking innocents reads as evil, defending/trading reads as good, and it matters because other players can see your standing and act on it (bounties, Federal trust). Profitable's Multiplayer design is deliberately async with no shared real-time presence (`universe.md`), and combat here resolves against rolled NPC threat encounters, not other players — there's no one to actually be good or evil *toward*. Without that, an alignment axis would either duplicate what Universe's leaderboards (net worth, trading volume) already track, or invent a synthetic morality signal with no real in-fiction referent (e.g., "fleeing a random encounter earns good points") — the same category of thinness Genesis Torpedoes had without PvP territory stakes to give it weight. Not revisited unless Multiplayer's shape changes to include real player-to-player interaction, the same condition attached to Genesis Torpedoes' own reconsideration trigger.

## 8. Corporations vs. the Universe/Multiplayer Design

**TW2002:** Corporations are **live, real-time alliances** — shared Citadel docking, shared credits, a CEO founder controlling membership, a corporate flagship. Direct, synchronous cooperation between logged-in players.

**Profitable:** `universe.md` (design-only) — explicitly the opposite shape, and explicitly chosen that way: "asynchronous, market-and-leaderboard-only — no shared real-time presence... deliberately avoids the most expensive multiplayer shape (live shared galaxy, real-time sync, conflict resolution)."

**Status: Conflict with an already-locked decision, not recommended to reopen.** TW2002's corporations are precisely the synchronous-cooperation shape Multiplayer's design pass considered and rejected, for reasons specific to this project (reusing the async/catch-up architecture pattern everything else already uses, avoiding a live-presence backend). Named here so the tension between "TW2000 is the basis" and "Multiplayer stays asynchronous" is on the record explicitly rather than silently unresolved.

## 9. Minor/Presentation-Level Differences

- **StarDock as a multi-facility hub** (shipyard + bank + tavern + police + cinema at one special Class-9 port) vs. Profitable's single-purpose `ShipyardScene` — a presentation/flavor question, not a mechanical one. Low priority.
- **Haggling as an interactive negotiation** vs. Profitable's flat listed-price purchase — could be layered onto `planetary-markets.md` without touching drift/recovery's underlying math, since haggling in TW2002 determines the *transaction* price within an already-computed range, not the port's baseline. Worth a mention, not urgent.

---

## Summary Table

| Area | TW2002 | Profitable today | Status |
|---|---|---|---|
| Galaxy structure | Sector graph, warps | 2D coordinates | Conflict (deliberate) |
| Core loop resource | Daily turn allocation | Real-time/timestamps; retuned Fuel carries the "spend it wisely" tension instead | **Resolved — deliberate non-adoption, Fuel retuned as the substitute, built** |
| Trading counterparty | Permanent NPC ports | Player listings + `sellToMarket()`/`sellToGlobalMarket()` | **Resolved and built** |
| Planet production | Colonist-driven | Colonist-gated, built | **Resolved and built** |
| Planet creation | Genesis Torpedoes | Fixed, generated once | Deliberate divergence (considered, declined — architectural cost vs. thin payoff) |
| Planet ownership | Citadels, 6 levels | Citadels, 3 levels — built, tested, then retroactively cut from alpha scope (2026-08-04) | **Built, then removed as a scope reduction — see `planet-ownership.md`** |
| Ship model | Fixed named classes | Component-built | Deliberate divergence |
| Combat depth | Fighters/shields/mines, multi-step | Single roll | Deliberate divergence |
| Reputation | Alignment, bounties | None | Deliberate divergence (considered, declined — no other player to be good/evil toward) |
| Alliances | Real-time corporations | Async Universe layer | Conflict (deliberate) |
| Port hub / haggling | StarDock, negotiation | Single shipyard, flat price | Minor gap |

---

## Open Questions

These are the items that actually need a decision — everything tagged "Deliberate divergence" above is settled and isn't relitigated here.

1. ~~**The trading counterparty gap is real and verified — does it get fixed, and how?**~~ **Resolved and built.** Fixed as an instant listing-free sell (`sellToMarket()`/`sellToGlobalMarket()`) rather than a TW2002-style self-replenishing NPC port — implemented, tested, wired into both `MarketScene` and `GlobalMarketScene`.
2. ~~**Does Profitable want any session-scarce resource analogous to TW2002's turns?**~~ **Resolved: no.** A turns-equivalent was explicitly not adopted — it would contradict the real-time/catch-up architecture. Instead, Fuel itself was retuned (`profitable-design-questions.md`'s Ship Fuel section) so capacity is a genuine routing constraint at low/mid ship tiers rather than a non-factor at every tier — the closest substitute this architecture can support, design-locked, not yet built. Two smaller, independent follow-on levers (per-planet fuel price variance; scarce refuel availability) were considered and deliberately left for later, not bundled in.
3. ~~**Is planet ownership (colonists, citadels, player-created planets) worth pursuing as a real design pass?**~~ **Fully resolved.** Colonists and Citadels got that pass (`planet-ownership.md`) and were both fully built; Citadels was subsequently retroactively cut from alpha scope (2026-08-04) — a scope decision, not a reversal of this resolution. Player-created planets (Genesis Torpedoes) were given their own standalone look and explicitly declined — architectural cost (breaks `galaxy.md`'s fixed-seed invariant) outweighs the payoff (thin without corp/PvP territory stakes). Not revisited unless Multiplayer eventually adds real territory contention.
4. ~~**Is a reputation/alignment system worth adding?**~~ **Resolved: no.** Declined — Profitable has no other player to be good or evil *toward* (Multiplayer is deliberately async, combat resolves against NPC threat rolls, not players), so an alignment axis would either duplicate Universe's existing leaderboard metrics or invent a morality signal with no real referent. Same reconsideration trigger as Genesis Torpedoes: revisit only if Multiplayer's shape changes to include real player-to-player interaction.
5. **Is haggling worth layering onto the existing trading formulas** as an interaction-design enhancement, independent of the other, larger questions above?

---

## Sources

- [TradeWars 2002 - Break Into Chat - BBS wiki](https://breakintochat.com/wiki/TradeWars_2002)
- [Trade Wars | BBS Wiki | Fandom](https://bbs.fandom.com/wiki/Trade_Wars)
- [Gypsy's Big Dummy's Guide to TradeWars Text - TradeWars Museum](https://wiki.classictw.com/index.php/Gypsy's_Big_Dummy's_Guide_to_TradeWars_Text)
- [TWS2 User's Guide](https://www.angelfire.com/mac/tradewars/docs/TWS2doc.html)
- [TradeWars 2002 Player Tips, Tricks, and Cheats - The Stardock](https://www.thestardock.com/files/manuals/TWLinksManuals/TradeWars%202002%20Player%20Tips,%20Tricks,%20and%20Cheats.htm)
- [TradeWars, a Space Strategy Classic - MTrek](http://mtrek.com/tradewars-a-space-strategy-classic/)
- [Ships - The Stardock - TradeWars 2002 Archives](https://www.thestardock.com/files/ModernManual/core/ships.md)
- [Combat - The Stardock - TradeWars 2002 Archives](https://www.thestardock.com/files/ModernManual/strategy/combat.md)
- [Trade Wars 2002 Version 3](http://www.tw-attac.com/docs/TradeWars.html)
- [The Trade Wars 2002 Bible (Clme, updated 2007)](http://www.penismightier.com/clme/Trade_Wars/Trade_Wars_2002_Bible.htm)
- [Citadel - TradeWars Documentation Wiki](https://docs.classictw.com/index.php/Citadel)
- [Game Play — The Stardock](https://www.thestardock.com/?cat=19)
- [Xeulian Field Manual Text - TradeWars Museum](http://wiki.classictw.com/index.php/Xeulian_Field_Manual_Text)
- [1991: Trade Wars 2002 - by Aaron A. Reed](https://if50.substack.com/p/1991-trade-wars-2002)
- [Ports - The Stardock - TradeWars 2002 Archives](https://www.thestardock.com/files/ModernManual/core/ports.md)
