namespace Profitable.Core.Schema;

// Ports src/data/types/encounterResolution.ts. Wraps both outputs from
// ResolveEncounters' one pass together, rather than that function
// gaining a second, out-of-band return channel.
public class EncounterResolution
{
    public List<EncounterResult> Encounters { get; set; } = new();
    public List<CombatEncounter> PendingCombats { get; set; } = new();
}
