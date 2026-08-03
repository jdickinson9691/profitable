namespace Profitable.Core.Schema;

// Ports src/data/types/crewCandidate.ts. The "browsable, not-yet-hired"
// shape -- HireCrew is what turns one into a real CrewMember (assigning
// the hire-specific fields at that moment). Profession is null for tiers
// 1-5 (Grey-Purple, general/unspecialized); rolled from the tier 6-7
// taxonomy only for Orange/Gold candidates.
public class CrewCandidate
{
    public string Id { get; set; } = string.Empty;
    public TierColor Tier { get; set; }
    public string? Profession { get; set; }
}
