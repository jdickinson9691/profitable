// Necessary completion: Agent 1's Phase 4 amendment contract names a
// `Profession` type for `CrewMember.profession` but never defines it --
// the full list/scope of tier 6-7 crafting professions was an open
// design question until the alpha content roster closed it
// (docs/profitable-alpha-content-roster.md §6 ->
// src/data/constants/crewConfig.ts's TIER_6_7_PROFESSIONS: Weaponsmith,
// Engineer, Shield Technician, Cargo Specialist, Artisan). Kept as a
// free-form string rather than upgraded to a literal union/enum -- the
// taxonomy is now decided but nothing currently depends on exhaustive
// compile-time checking of it (assignToCraft()/craft() don't branch on
// profession yet, per src/crew/README.md), so narrowing the type would
// be speculative tightening with no consumer to justify it yet.
export type Profession = string;
