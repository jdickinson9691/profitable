namespace Profitable.Core.Schema;

// Ports src/galaxy/generateGalaxy.ts's Galaxy interface.
public class Galaxy
{
    public string Seed { get; set; } = string.Empty;
    public List<Planet> Planets { get; set; } = new();
}
