namespace Profitable.Core.Schema;

// Ports src/data/types/shipyardPool.ts. A small, refreshing pool of
// unpurchased ships at one planet's market, the same pattern already
// built for goods pricing and NPC crew hiring, applied to whole ships.
public class ShipyardPool
{
    public string PlanetId { get; set; } = string.Empty;
    public List<ShipCandidate> AvailableShips { get; set; } = new();
    public long LastRefreshedAt { get; set; }
}
