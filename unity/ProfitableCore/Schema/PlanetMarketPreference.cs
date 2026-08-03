namespace Profitable.Core.Schema;

// Ports src/data/types/planetMarketPreference.ts. Keyed by PlanetType (4
// fixed values) rather than by specific generated-planet id -- the galaxy
// is procedurally generated per save from a stored seed, so no fixed set
// of "real" planet ids exists for static content to reference ahead of
// time. A specific generated Planet looks up its preference entry by its
// own PlanetType field at seed time. Day-one seed only -- baseline drift
// moves actual prices away from these initial groupings as soon as any
// trading activity occurs; not re-read or treated as authoritative after
// that.
public class PlanetMarketPreference
{
    public PlanetType PlanetType { get; set; }
    public List<string> SellsCheap { get; set; } = new();
    public List<string> BuysAtPremium { get; set; } = new();
}
