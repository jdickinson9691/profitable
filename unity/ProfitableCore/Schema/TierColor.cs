namespace Profitable.Core.Schema;

// Ports src/data/types/tierColor.ts. Declaration order is Grey..Gold
// (worst to best), matching the TypeScript union's order and every table
// that enumerates tiers in this order (TIER_COLOR_BREAKPOINTS etc.).
public enum TierColor
{
    Grey,
    White,
    Green,
    Blue,
    Purple,
    Orange,
    Gold,
}
