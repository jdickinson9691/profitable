# Profitable — Alpha UI/UX & Onboarding Plan

Concrete plan for Section 4 of `product-alpha-plan.md`. Scoped deliberately narrow — first-playable clarity, not visual polish. Art, sound design, and animation are explicitly excluded here, per the plan doc's own scope line.

---

## 1. First-Time Onboarding Flow

**Recommendation: a sequenced, skippable tooltip walkthrough over the existing screens — not a separate tutorial level or scripted scenario.**

Building a bespoke tutorial (a fake starter mission, a scripted first galaxy) would mean building and maintaining content that only a new player ever sees once — expensive for what it returns. Tooltips layered over the *real* game screens teach the actual interface directly, and cost far less to build and update as the underlying screens change.

**Concrete sequence**, following the natural order a new player would actually need it (matches the MVP's original gather → refine → craft loop, now extended through the full alpha feature set):

1. **Gather screen:** "This is Delta Rigelus-equivalent starting planet. Click to gather Igneous Ore." → shows the quality roll result and its color tier.
2. **Refine screen:** "Combine resources into something more valuable." → guides one refining action using a known-by-default recipe (per the content roster's starter set).
3. **Craft screen:** "Turn refined materials into finished goods." → guides one crafting action, again using a known-by-default recipe.
4. **Market screen:** "Sell what you've made." → guides listing the crafted item at the local planet market.
5. **Map/Travel screen:** "Explore — most of the galaxy is still undiscovered." → points at an adjacent undiscovered planet and guides initiating a voyage.
6. **Shipyard (triggered on first visit, not forced early):** "Buy your first ship" → surfaces the Starter Runner preset from the content roster as a suggested first purchase.
7. **Crew (triggered on first visit):** "Hire crew to work while you're away" → brief explainer of the active/idle distinction.

**Must be skippable at every step** — a player who already understands the loop (returning playtester, dev, etc.) shouldn't be forced through it. Store completion/skip state via the existing `SaveSystem` adapter — no new persistence mechanism needed.

## 2. Settings Screen

**Minimum for alpha:**
- Audio on/off toggle, wired to the existing `AudioManager` — this is the one piece of genuinely user-facing settings work, since the adapter already exists and just needs a UI control.
- A "reset onboarding" option (re-trigger the tooltip flow above) — useful for playtesting the onboarding itself repeatedly.

**Debug/Tuning panel — recommended as higher priority than a polished settings menu for alpha specifically:**
A simple, ugly-is-fine panel exposing the tunable values from `profitable-alpha-tuning-values.md` for live adjustment during a play session — drift %, wage curves, encounter trigger chances, etc. This is more valuable *during* alpha than a consumer-facing settings screen, since Section 2's whole point is that these numbers need to be tuned through actual play, and re-deploying a build for every single number change would make that pass far slower than it needs to be. Recommend gating this behind a debug flag/URL parameter so it's not visible in whatever build gets shared outside the immediate dev/playtest group.

## 3. Tier Color Legibility Pass

Every tier-driven system in this design (resource quality, refiner/crafter skill, planet tier, ship tier, schematic tier, scanner tier, crew tier) depends on a player being able to glance at a color and immediately know where it sits on the Grey→Gold scale. This has been *functionally* correct throughout (the right color renders) but was never explicitly design-reviewed for at-a-glance legibility.

**Recommendation:** a short, dedicated pass — not a full art pass — confirming:
- The 7 colors are distinguishable from each other at the sizes they actually render at in each screen (a small inventory icon vs. a large market listing, for example).
- Colorblind-safe differentiation isn't relied on by hue alone where avoidable (even a minimal alpha-level treatment — e.g., pairing color with a short tier-letter label — is cheap insurance here, since this system is genuinely load-bearing for the entire game's readability).

## 4. Explicitly Out of Scope for Alpha

Per the plan doc's own scope line, restated here for clarity: custom art assets, music/sound design beyond the existing on/off toggle, animation polish, and a full accessibility pass. These are real, valuable work — just not first-playable blockers, and pulling them into alpha scope would meaningfully delay it for a return that matters more post-alpha, once the numbers and content from Sections 1-2 are actually stable.
