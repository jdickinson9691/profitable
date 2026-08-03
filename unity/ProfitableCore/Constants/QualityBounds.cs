namespace Profitable.Core.Constants;

// Ports src/data/constants/quality.ts's QUALITY_MIN/QUALITY_MAX -- every
// quality is an integer in this range. Used by ResolveComponentRepair and
// ResolveCombatChoice (the only two ported functions that clamp a
// recomputed durability value back into range).
public static class QualityBounds
{
    public const int Min = 1;
    public const int Max = 100;
}
