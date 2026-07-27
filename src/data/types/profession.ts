// Necessary completion: Agent 1's Phase 4 amendment contract names a
// `Profession` type for `CrewMember.profession` but never defines it --
// the full list/scope of tier 6-7 crafting professions is still an
// explicitly open design question (profitable-design-questions.md,
// tracked since the original MVP GDD's "full scope post-MVP" note).
// Rather than inventing a fixed taxonomy the design hasn't decided (the
// same must-not-invent rule this amendment's own contract applies to the
// background/idle rate constant), Profession is a free-form string
// identifier for now. A real enum can replace this without changing
// CrewMember's shape once the actual profession list is decided.
export type Profession = string;
