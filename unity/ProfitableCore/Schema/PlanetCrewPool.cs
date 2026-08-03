namespace Profitable.Core.Schema;

// Ports src/data/types/planetCrewPool.ts. A small, refreshing pool of
// unhired candidates at one planet's market -- the same "planet markets
// have their own state that changes over time" pattern Sub-Phase B's
// PlanetMarketState already established, applied to crafters instead of
// items.
public class PlanetCrewPool
{
    public string PlanetId { get; set; } = string.Empty;
    public List<CrewCandidate> AvailableHires { get; set; } = new();
    public long LastRefreshedAt { get; set; }
}
