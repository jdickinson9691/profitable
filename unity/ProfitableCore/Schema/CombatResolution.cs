namespace Profitable.Core.Schema;

// Ports src/data/types/combatResolution.ts. Not a discriminated union --
// every choice (attack or flee) produces exactly this shape; the fields
// simply differ in what's populated. UpdatedCrewMember/RetreatVoyage are
// both null on a win; on lose/flee, RetreatVoyage is always set, but
// UpdatedCrewMember stays null too if the player owns no crew at all.
public class CombatResolution
{
    public CombatEncounter CombatEncounter { get; set; } = new();
    public Ship UpdatedShip { get; set; } = new();
    public CrewMember? UpdatedCrewMember { get; set; }
    public Voyage? RetreatVoyage { get; set; }
}
