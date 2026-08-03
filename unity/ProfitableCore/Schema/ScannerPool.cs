namespace Profitable.Core.Schema;

// Ports src/data/types/scannerPool.ts. Its own separate pool type, not
// merged into ShipyardPool.
public class ScannerPool
{
    public string PlanetId { get; set; } = string.Empty;
    public List<ScannerCandidate> AvailableScanners { get; set; } = new();
    public long LastRefreshedAt { get; set; }
}
