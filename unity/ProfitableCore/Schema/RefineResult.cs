namespace Profitable.Core.Schema;

// Ports src/data/types/refineResult.ts. Necessary completion (see
// agent-32-unity-simulation-core.md's Outputs Section 1).
public class RefineResult
{
    public QualityMap Qualities { get; set; } = new();

    // Tier used to key the refund chance table -- the straight-average
    // -then-tier stub applied to the 5 final output values, since refined
    // items display per-quality tiers rather than one aggregate. Exposed
    // so tests can verify refund chance was keyed off this, not the
    // inputs' tier.
    public TierColor OutputTier { get; set; }
    public int RefundUnits { get; set; }
}
