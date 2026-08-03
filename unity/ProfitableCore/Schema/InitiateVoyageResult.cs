namespace Profitable.Core.Schema;

// Ports src/data/types/initiateVoyageResult.ts. Fuel deduction is a real
// Ship state change the caller must persist -- same "return what
// changed" discipline every other core function in this codebase follows.
public class InitiateVoyageResult
{
    public Voyage Voyage { get; set; } = new();
    public Ship UpdatedShip { get; set; } = new();
}
